package handlers

import (
	"encoding/json"
	"net/http"
	"net/url"
)

func urlEscape(s string) string {
	return url.QueryEscape(s)
}

func decodeJSON(r *http.Request, v any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

func maxStr(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}