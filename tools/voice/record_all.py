"""Record and judge every line, round by round: anchor.py makes one take of each line that wants another (in the Qwen
venv), then pick.py judges the new takes and ships the best so far (in the Chatterbox venv). One after the other, never
both at once (2 threads, and the voice model alone wants about 7 GB). Stop it any time; run it again and it carries on.

  node tools/voice/script.mjs DIR/lines.json
  python tools/voice/record_all.py DIR --qwen QWEN_PYTHON --judge CHATTERBOX_PYTHON --ship DIR/ship [--rounds 16]
"""
import argparse, os, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('dir')
    ap.add_argument('--qwen', required=True)
    ap.add_argument('--judge', required=True)
    ap.add_argument('--ship', required=True)
    ap.add_argument('--rounds', type=int, default=16)
    ap.add_argument('--start', type=int, default=0)
    a = ap.parse_args()
    lines = os.path.join(a.dir, 'lines.json')
    for k in range(a.start, a.rounds):
        t = time.time()
        subprocess.run([a.qwen, os.path.join(HERE, 'anchor.py'), lines, '--takes', a.dir, '--round', str(k)], check=True)
        subprocess.run([a.judge, os.path.join(HERE, 'pick.py'), lines, '--takes', a.dir, '--ship', a.ship], check=True)
        print(f'== round {k} done in {(time.time() - t) / 60:.0f} min', flush=True)


if __name__ == '__main__':
    sys.exit(main())
