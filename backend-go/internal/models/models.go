package models

import "time"

type User struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"createdAt"`
}

type Module struct {
	ID            string    `json:"id"`
	UserID        string    `json:"userId"`
	Title         string    `json:"title"`
	ShortCode     string    `json:"shortCode"`
	FilePath      string    `json:"-"`
	FileSizeBytes int64     `json:"fileSizeBytes"`
	IsActive      bool      `json:"isActive"`
	CreatedAt     time.Time `json:"createdAt"`
	UserName      string    `json:"userName,omitempty"`
	SubCount      int64     `json:"subCount,omitempty"`
}

type Submission struct {
	ID           string    `json:"id"`
	ModuleID     string    `json:"moduleId"`
	StudentName  string    `json:"studentName"`
	StudentClass string    `json:"studentClass"`
	Score        float64   `json:"score"`
	AnswersJSON  *string   `json:"answersJson,omitempty"`
	SubmittedAt  time.Time `json:"submittedAt"`
}

type Stats struct {
	TotalModules      int64 `json:"totalModules"`
	TotalSubmissions  int64 `json:"totalSubmissions"`
	TotalStorageBytes int64 `json:"totalStorageBytes"`
	TotalGuru         int64 `json:"totalGuru,omitempty"`
}

const (
	RoleAdmin = "admin"
	RoleGuru  = "guru"

	StatusActive    = "active"
	StatusSuspended = "suspended"
)