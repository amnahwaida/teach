package auth

import (
	"golang.org/x/crypto/bcrypt"
)

// HashPassword menghasilkan bcrypt hash.
func HashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(b), err
}

// ComparePassword membandingkan password plaintext dengan hash.
func ComparePassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}