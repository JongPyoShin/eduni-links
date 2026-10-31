"""Adult-only local preview; never reconfigures production or persists secrets."""
from pathlib import Path
import os
import secrets
import socket
import subprocess
import sys
import tempfile
import time
from urllib.request import urlopen


def free_port():
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        return listener.getsockname()[1]


def main():
    if sys.argv[1:] != ['--owner-live']:
        raise SystemExit('Use --owner-live for an adult-supervised synthetic-question preview. Questions use ChatGPT subscription usage.')
    root = Path(__file__).resolve().parents[1]
    bridge_port, app_port = free_port(), free_port()
    children = []
    with tempfile.TemporaryDirectory(prefix='eduni-companion-') as temporary:
        environment = os.environ.copy()
        # Avoid accidentally inheriting production databases/provider configuration.
        for name in list(environment):
            if name.startswith('EDUNI_READING_') or name.startswith('EDUNI_AI_'):
                del environment[name]
        environment.update(
            EDUNI_AI_COMPANION_ENABLED='1',
            EDUNI_AI_COMPANION_PROVIDER='bridge',
            EDUNI_AI_COMPANION_BRIDGE_KEY=secrets.token_hex(32),
            EDUNI_AI_COMPANION_BRIDGE_PORT=str(bridge_port),
            EDUNI_AI_COMPANION_BRIDGE_URL=f'http://127.0.0.1:{bridge_port}',
            EDUNI_PORTAL_DB=str(Path(temporary) / 'portal.sqlite3'),
            EDUNI_HOST='127.0.0.1', PORT=str(app_port),
        )
        try:
            children.append(subprocess.Popen([sys.executable, '-m', 'scripts.eduni_chatgpt_bridge'], cwd=root, env=environment, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
            children.append(subprocess.Popen([sys.executable, 'app.py'], cwd=root, env=environment, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
            url = f'http://127.0.0.1:{app_port}'
            for _ in range(100):
                if any(child.poll() is not None for child in children):
                    raise RuntimeError('Preview startup failed; no credentials or database were printed.')
                try:
                    with urlopen(url + '/healthz', timeout=1) as response:
                        if response.status == 200:
                            break
                except OSError:
                    time.sleep(.2)
            else:
                raise RuntimeError('Preview health check timed out')
            print('OWNER PREVIEW ' + url + '/portal', flush=True)
            print('Loopback only; synthetic questions only; no production or stored child data.', flush=True)
            while all(child.poll() is None for child in children):
                time.sleep(.5)
        except KeyboardInterrupt:
            pass
        finally:
            for child in children:
                if child.poll() is None:
                    child.terminate()
            for child in children:
                try:
                    child.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    child.kill()
                    child.wait()


if __name__ == '__main__':
    main()
