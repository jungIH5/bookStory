"""공용 slowapi Limiter 인스턴스.
main.py와 라우터들이 순환 import 없이 같은 인스턴스를 공유하기 위해 분리했다."""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["200/15minutes"])
