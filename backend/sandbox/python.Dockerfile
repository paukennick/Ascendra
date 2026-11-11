# REQ-196: the image lib/sandbox-runner.ts runs Python verification programs
# in. Built by the workflows WITH network (pip), then every program runs in it
# with --network none, read-only, as nobody. Standard library + SymPy only,
# pinned, so a program cannot pull anything at run time.
FROM python:3.15-slim@sha256:65a65fc7b30b06cb6df4930fd4650697cb23f4c2698ab81fc87e4b031bc36928
RUN pip install --no-cache-dir --disable-pip-version-check sympy==1.14.0 mpmath==1.3.0 \
 && python3 -c "import sympy; print(sympy.__version__)"
USER 65534:65534
WORKDIR /scratch
