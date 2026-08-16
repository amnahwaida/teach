package prompts

import (
	_ "embed"
	"encoding/json"
	"fmt"
)

//go:embed prompts.json
var promptsJSON []byte

type Prompt struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Category    string `json:"category"`
	Icon        string `json:"icon"`
	Description string `json:"description"`
	Guide       string `json:"guide"`
	Prompt      string `json:"prompt"`
}

var all []Prompt

func init() {
	if err := json.Unmarshal(promptsJSON, &all); err != nil {
		panic(fmt.Sprintf("gagal memuat data prompt: %v", err))
	}
}

func All() []Prompt { return all }

func Categories() []string {
	seen := map[string]bool{}
	var cats []string
	for _, p := range all {
		if !seen[p.Category] {
			seen[p.Category] = true
			cats = append(cats, p.Category)
		}
	}
	return cats
}

func GetByID(id string) *Prompt {
	for i := range all {
		if all[i].ID == id {
			return &all[i]
		}
	}
	return nil
}
