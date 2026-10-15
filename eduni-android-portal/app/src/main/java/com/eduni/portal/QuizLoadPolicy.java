package com.eduni.portal;

/** Keeps remote content enrichment off the interaction-critical quiz path. */
public final class QuizLoadPolicy<T> {
    private T cached;
    public synchronized T takeOr(T localFallback) { if (cached == null) return localFallback; T result = cached; cached = null; return result; }
    public synchronized void cacheRemote(T remote) { if (remote != null) cached = remote; }
    public synchronized boolean hasCachedRemote() { return cached != null; }
}
