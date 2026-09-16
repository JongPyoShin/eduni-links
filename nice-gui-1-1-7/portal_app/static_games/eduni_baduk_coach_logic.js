((root) => {
  'use strict';

  function create(engine) {
    if (!engine) throw new Error('EDUNI Baduk engine is required');

    function groupKey(group) {
      return group.stones.map(([r, c]) => `${r},${c}`).sort().join('|');
    }

    function uniqueAdjacentGroups(source, row, col, color) {
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      const groups = [];
      const seen = new Set();
      for (const [dr, dc] of dirs) {
        const r = row + dr, c = col + dc;
        if (r < 0 || c < 0 || r >= engine.SIZE || c >= engine.SIZE) continue;
        if (source[r][c] !== color) continue;
        const group = engine.groupAt(source, r, c);
        const key = groupKey(group);
        if (!seen.has(key)) {
          seen.add(key);
          groups.push(group);
        }
      }
      return groups;
    }

    function allGroups(source, color) {
      const groups = [];
      const seen = new Set();
      for (let r = 0; r < engine.SIZE; r++) {
        for (let c = 0; c < engine.SIZE; c++) {
          if (source[r]?.[c] !== color || seen.has(`${r},${c}`)) continue;
          const group = engine.groupAt(source, r, c);
          for (const [gr, gc] of group.stones) seen.add(`${gr},${gc}`);
          groups.push(group);
        }
      }
      return groups;
    }

    function reasonCodeFrom(result, row, col) {
      if (row < 0 || col < 0 || row >= engine.SIZE || col >= engine.SIZE) return 'outside';
      const reason = result?.reason || '';
      if (reason.includes('이미')) return 'occupied';
      if (reason.includes('자충수')) return 'suicide';
      if (reason.includes('패 때문에')) return 'ko';
      return 'illegal';
    }

    function illegalCopy(reasonCode, rawReason) {
      if (reasonCode === 'occupied') return ['여기는 지금 둘 수 없어요', '여기는 이미 돌이 있어요.'];
      if (reasonCode === 'suicide') return ['여기는 지금 둘 수 없어요', '여기에 두면 내 돌이 숨 쉴 곳(활로)이 하나도 없어요.'];
      if (reasonCode === 'ko') return ['패 때문에 잠깐 기다려야 해요', '방금 전 모양으로 바로 돌아가는 패라서 지금은 둘 수 없어요.'];
      if (reasonCode === 'outside') return ['바둑판 안에 놓아 주세요', '교차점 안쪽을 골라 주세요.'];
      return ['여기는 지금 둘 수 없어요', rawReason || '다른 자리를 살펴보세요.'];
    }

    function analyzeMove(source, row, col, color, koState) {
      const beforeKey = engine.boardKey(source);
      const result = engine.tryMove(source, row, col, color, koState);
      const sourceUnchanged = engine.boardKey(source) === beforeKey;
      if (!result.legal) {
        const reasonCode = reasonCodeFrom(result, row, col);
        const [title, summary] = illegalCopy(reasonCode, result.reason);
        return {
          legal: false,
          reasonCode,
          title,
          summary,
          captured: 0,
          ownLibertiesAfter: 0,
          libertyPoints: [],
          capturedStones: [],
          opponentAtariGroups: [],
          opponentAtariStones: [],
          rescuedOwnGroups: 0,
          connectedOwnGroups: 0,
          selfAtariRisk: false,
          sourceUnchanged,
          row,
          col,
          color,
          beforeBoard: source,
          afterBoard: source,
          badges: [],
        };
      }

      const opponent = color === engine.BLACK ? engine.WHITE : engine.BLACK;
      const capturedStones = [];
      for (let r = 0; r < engine.SIZE; r++) {
        for (let c = 0; c < engine.SIZE; c++) {
          if (source[r][c] === opponent && result.board[r][c] === engine.EMPTY) capturedStones.push([r, c]);
        }
      }

      const adjacentOwnBefore = uniqueAdjacentGroups(source, row, col, color);
      const connectedOwnGroups = adjacentOwnBefore.length;
      const endangeredOwn = adjacentOwnBefore.filter(group =>
        group.liberties.length === 1 && group.liberties[0][0] === row && group.liberties[0][1] === col
      );
      const ownAfter = engine.groupAt(result.board, row, col);
      const rescuedOwnGroups = ownAfter.liberties.length > 1 ? endangeredOwn.length : 0;

      const opponentAfter = uniqueAdjacentGroups(result.board, row, col, opponent);
      const opponentAtariGroups = opponentAfter.filter(group => group.liberties.length === 1);
      const opponentAtariStones = opponentAtariGroups.flatMap(group => group.stones);
      const selfAtariRisk = result.captured === 0 && ownAfter.liberties.length === 1;

      let title = '여기는 둘 수 있어요';
      let summary = `규칙상 둘 수 있어요. 놓은 뒤 내 돌의 숨 쉴 곳(활로)은 ${ownAfter.liberties.length}개예요.`;
      const badges = [];

      if (result.captured > 0) {
        summary = `여기에 두면 상대 돌 ${result.captured}개를 잡아요.`;
        badges.push(`포획 ${result.captured}개`);
      } else if (rescuedOwnGroups > 0) {
        summary = '위험했던 내 돌의 숨 쉴 곳이 늘어나요.';
        badges.push('내 돌 구출');
      } else if (opponentAtariGroups.length > 0) {
        summary = '상대 돌의 숨 쉴 곳이 1개만 남아 단수예요.';
        badges.push('단수 · 숨 쉴 곳 1개');
      } else if (connectedOwnGroups >= 2) {
        summary = '떨어져 있던 내 돌이 이 자리에서 이어져요.';
        badges.push('내 돌 연결');
      } else if (selfAtariRisk) {
        title = '둘 수는 있지만 조심해요';
        summary = '내 돌의 숨 쉴 곳이 1개뿐이라 다음 수에 잡힐 수 있어요.';
        badges.push('숨 쉴 곳 1개');
      }

      if (badges.length < 2 && ownAfter.liberties.length > 1) badges.push(`활로 ${ownAfter.liberties.length}개`);
      if (badges.length < 2 && opponentAtariGroups.length > 0 && !badges.some(b => b.includes('단수'))) badges.push('상대 단수');

      return {
        legal: true,
        reasonCode: selfAtariRisk ? 'self_atari_risk' : 'legal',
        title,
        summary,
        captured: result.captured,
        ownLibertiesAfter: ownAfter.liberties.length,
        libertyPoints: ownAfter.liberties,
        capturedStones,
        opponentAtariGroups,
        opponentAtariStones,
        rescuedOwnGroups,
        connectedOwnGroups,
        selfAtariRisk,
        sourceUnchanged,
        row,
        col,
        color,
        beforeBoard: source,
        afterBoard: result.board,
        badges: badges.slice(0, 2),
      };
    }

    function analyzeAiDanger(beforeBoard, afterBoard, aiMove = null) {
      const beforeKey = engine.boardKey(beforeBoard);
      const afterKey = engine.boardKey(afterBoard);
      const capturedStones = [];
      for (let r = 0; r < engine.SIZE; r++) {
        for (let c = 0; c < engine.SIZE; c++) {
          if (beforeBoard[r]?.[c] === engine.BLACK && afterBoard[r]?.[c] !== engine.BLACK) {
            capturedStones.push([r, c]);
          }
        }
      }

      if (capturedStones.length) {
        return {
          level: 'critical',
          reasonCode: 'captured',
          title: '🚨 내 돌이 잡혔어요',
          summary: `AI가 이곳에 두면서 내 돌 ${capturedStones.length}개가 숨 쉴 곳이 없어져 잡혔어요.`,
          affectedStones: capturedStones,
          capturedStones,
          libertyPoints: [],
          capturedCount: capturedStones.length,
          beforeLiberties: null,
          afterLiberties: 0,
          aiMove,
          sourceUnchanged: beforeKey === engine.boardKey(beforeBoard) && afterKey === engine.boardKey(afterBoard),
        };
      }

      const beforeGroups = allGroups(beforeBoard, engine.BLACK);
      const afterGroups = allGroups(afterBoard, engine.BLACK);
      const beforeByStone = new Map();
      for (const group of beforeGroups) {
        for (const [r, c] of group.stones) beforeByStone.set(`${r},${c}`, group);
      }

      let best = null;
      for (const group of afterGroups) {
        const matched = [];
        const seen = new Set();
        for (const [r, c] of group.stones) {
          const prev = beforeByStone.get(`${r},${c}`);
          if (!prev) continue;
          const key = groupKey(prev);
          if (!seen.has(key)) {
            seen.add(key);
            matched.push(prev);
          }
        }
        if (!matched.length) continue;
        const beforeLiberties = Math.max(...matched.map(g => g.liberties.length));
        const afterLiberties = group.liberties.length;
        if (afterLiberties >= beforeLiberties) continue;
        const level = afterLiberties === 1 && beforeLiberties > 1
          ? 'danger'
          : afterLiberties === 2 && beforeLiberties > 2
            ? 'caution'
            : null;
        if (!level) continue;
        const candidate = {group, beforeLiberties, afterLiberties, level};
        if (!best || candidate.afterLiberties < best.afterLiberties ||
            (candidate.afterLiberties === best.afterLiberties && candidate.beforeLiberties > best.beforeLiberties)) {
          best = candidate;
        }
      }

      if (best) {
        const danger = best.level === 'danger';
        return {
          level: best.level,
          reasonCode: danger ? 'new_atari' : 'liberties_reduced',
          title: danger ? '🚨 이 돌이 위험해요' : '⚠️ 이쪽을 조심해요',
          summary: danger
            ? '이 돌들은 숨 쉴 곳이 1개만 남았어요. AI가 그곳까지 막으면 잡힐 수 있어요.'
            : 'AI가 가까이 와서 이 돌들의 숨 쉴 곳이 2개로 줄었어요.',
          affectedStones: best.group.stones.map(([r, c]) => [r, c]),
          capturedStones: [],
          libertyPoints: best.group.liberties.map(([r, c]) => [r, c]),
          capturedCount: 0,
          beforeLiberties: best.beforeLiberties,
          afterLiberties: best.afterLiberties,
          aiMove,
          sourceUnchanged: beforeKey === engine.boardKey(beforeBoard) && afterKey === engine.boardKey(afterBoard),
        };
      }

      return {
        level: 'safe',
        reasonCode: 'safe',
        title: '🙂 지금은 크게 위험하지 않아요',
        summary: '이번 AI 수로 바로 잡힐 위험은 커지지 않았어요.',
        affectedStones: [],
        capturedStones: [],
        libertyPoints: [],
        capturedCount: 0,
        beforeLiberties: null,
        afterLiberties: null,
        aiMove,
        sourceUnchanged: beforeKey === engine.boardKey(beforeBoard) && afterKey === engine.boardKey(afterBoard),
      };
    }

    function strongestAiReason(move) {
      const components = move?.aiAnalysis?.components || {};
      const strategic = [
        ['capture', components.capture || 0],
        ['atari', components.atari || 0],
        ['spread', components.spread || 0],
        ['opening', components.opening || 0],
        ['neighbors', components.neighbors || 0],
        ['liberties', components.liberties || 0],
        ['center', components.center || 0],
      ].sort((a, b) => b[1] - a[1]);
      const key = strategic[0]?.[0] || 'center';
      if (key === 'capture' && move.result?.captured > 0) return `내 돌 ${move.result.captured}개를 바로 잡을 수 있는 자리였어요.`;
      if (key === 'atari' && (move.aiAnalysis.afterAtari - move.aiAnalysis.beforeAtari) > 0) return '내 돌의 숨 쉴 곳을 줄여서 잡기 쉽게 만드는 자리였어요.';
      if (key === 'spread' || key === 'opening') return '초반이라 넓은 곳을 먼저 차지하려고 했어요.';
      if (key === 'neighbors') return 'AI 돌과 이어지거나 내 돌을 압박하기 좋은 자리였어요.';
      if (key === 'liberties') return 'AI 돌이 답답하지 않게 숨 쉴 곳을 만들 수 있는 자리였어요.';
      return '여러 방향으로 움직이기 쉬운 자리였어요.';
    }

    return {analyzeMove, analyzeAiDanger, strongestAiReason};
  }

  root.EDUNIBadukCoachLogic = {create};
})(typeof globalThis !== 'undefined' ? globalThis : this);