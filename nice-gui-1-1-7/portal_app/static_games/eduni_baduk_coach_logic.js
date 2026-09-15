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
      let summary = `규칙상 둘 수 있어요. 놓은 뒤 내 돌의 활로는 ${ownAfter.liberties.length}개예요.`;
      const badges = [];

      if (result.captured > 0) {
        summary = `여기에 두면 상대 돌 ${result.captured}개를 잡아요.`;
        badges.push(`포획 ${result.captured}개`);
      } else if (rescuedOwnGroups > 0) {
        summary = '위험했던 내 돌의 활로가 늘어나요.';
        badges.push('내 돌 구출');
      } else if (opponentAtariGroups.length > 0) {
        summary = '상대 돌의 활로가 1개만 남아 단수가 돼요.';
        badges.push('상대 단수');
      } else if (connectedOwnGroups >= 2) {
        summary = '떨어져 있던 내 돌이 이 자리에서 이어져요.';
        badges.push('내 돌 연결');
      } else if (selfAtariRisk) {
        title = '둘 수는 있지만 조심해요';
        summary = '규칙상 둘 수 있지만 내 돌의 활로가 1개뿐이라 위험해요.';
        badges.push('활로 1개');
      }

      if (badges.length < 2 && ownAfter.liberties.length > 1) badges.push(`활로 ${ownAfter.liberties.length}개`);
      if (badges.length < 2 && opponentAtariGroups.length > 0 && !badges.includes('상대 단수')) badges.push('상대 단수');

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

    function strongestAiReason(move) {
      const components = move?.aiAnalysis?.components || {};
      const strategic = [
        ['capture', components.capture || 0],
        ['atari', components.atari || 0],
        ['neighbors', components.neighbors || 0],
        ['liberties', components.liberties || 0],
        ['center', components.center || 0],
      ].sort((a, b) => b[1] - a[1]);
      const key = strategic[0]?.[0] || 'center';
      if (key === 'capture' && move.result?.captured > 0) return `흑돌 ${move.result.captured}개를 잡을 수 있어서예요.`;
      if (key === 'atari' && (move.aiAnalysis.afterAtari - move.aiAnalysis.beforeAtari) > 0) return '흑돌의 활로를 줄여 단수를 만들 수 있어서예요.';
      if (key === 'neighbors') return '주변 돌과 가까워 연결하거나 압박하기 좋은 자리라서예요.';
      if (key === 'liberties') return `백돌의 활로를 ${move.result?.liberties || 0}개 확보할 수 있어서예요.`;
      return '여러 후보 중 가운데에 가까워 여러 방향으로 펼치기 쉬운 자리라서예요.';
    }

    return {analyzeMove, strongestAiReason};
  }

  root.EDUNIBadukCoachLogic = {create};
})(typeof globalThis !== 'undefined' ? globalThis : this);
