package handlers

import (
	"encoding/json"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
)

func urlEscape(s string) string {
	return url.QueryEscape(s)
}

// maxJSONBodyBytes: batas body JSON API (jawaban siswa maks 100KB).
const maxJSONBodyBytes = 1 << 20 // 1MB

func decodeJSON(r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, maxJSONBodyBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

// buildUpdateQuery menyusun UPDATE dinamis; kolom diurutkan agar rencana
// eksekusi Postgres deterministik. Kolom hanya berasal dari whitelist kunci
// request, jadi nilai tidak mungkin injeksi.
func buildUpdateQuery(table, whereCol string, set map[string]any, whereVal any) (string, []any) {
	cols := make([]string, 0, len(set))
	for col := range set {
		cols = append(cols, col)
	}
	sort.Strings(cols)

	var sb strings.Builder
	sb.WriteString("UPDATE ")
	sb.WriteString(table)
	sb.WriteString(" SET ")
	args := make([]any, 0, len(set)+1)
	for i, col := range cols {
		if i > 0 {
			sb.WriteString(", ")
		}
		sb.WriteString(col)
		sb.WriteString(" = $")
		sb.WriteString(strconv.Itoa(i + 1))
		args = append(args, set[col])
	}
	sb.WriteString(" WHERE ")
	sb.WriteString(whereCol)
	sb.WriteString(" = $")
	sb.WriteString(strconv.Itoa(len(set) + 1))
	sb.WriteString(" RETURNING id")
	args = append(args, whereVal)
	return sb.String(), args
}

func maxStr(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}
