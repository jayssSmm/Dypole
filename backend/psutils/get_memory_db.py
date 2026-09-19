import psutil, os

def get_memory_mb():
    return psutil.Process(os.getpid()).memory_info().rss / 1024**2