package handlers

import (
	"net"
	"net/http"
	"sync"
	"time"
)

// ipLimiter membatasi aksi per kunci (biasanya IP) dalam jendela waktu.
type ipLimiter struct {
	mu    sync.Mutex
	max   int
	every time.Duration
	count map[string]int
	until map[string]time.Time
}

func newIPLimiter(max int, every time.Duration) *ipLimiter {
	return &ipLimiter{
		max:   max,
		every: every,
		count: map[string]int{},
		until: map[string]time.Time{},
	}
}

// Allow mengembalikan true bila kunci masih dalam batas; false berarti
// kunci diblokir sampai window berikutnya.
func (l *ipLimiter) Allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	if t, ok := l.until[key]; ok && now.After(t) {
		delete(l.count, key)
		delete(l.until, key)
	}

	l.count[key]++
	if l.count[key] > l.max {
		l.until[key] = now.Add(l.every)
		return false
	}

	// bersihkan kunci lama bila peta membengkak (batas memori kasar)
	if len(l.count) > 10_000 {
		for k := range l.count {
			t, blocked := l.until[k]
			if !blocked || now.After(t) {
				delete(l.count, k)
				delete(l.until, k)
			}
		}
	}
	return true
}

// clientIP mengambil IP klien dari RemoteAddr. X-Forwarded-For sengaja
// TIDAK dipercaya karena bisa dipalsukan klien; aplikasi berjalan di
// belakang satu proxy (cloudflared/docker), jadi IP proxy pun cukup.
func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
