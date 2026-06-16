package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
)

// Encrypt encrypts plaintext using AES-256-GCM with the given key.
// Returns base64-encoded ciphertext.
func Encrypt(plaintext, key string) (string, error) {
	// Derive 32-byte key from the provided key string
	keyBytes := deriveKey32(key)
	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts a base64-encoded ciphertext using AES-256-GCM with the given key.
func Decrypt(encodedCiphertext, key string) (string, error) {
	keyBytes := deriveKey32(key)
	ciphertext, err := base64.StdEncoding.DecodeString(encodedCiphertext)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

func deriveKey32(s string) []byte {
	// Use a simple but effective key derivation
	h := make([]byte, 32)
	key := []byte(s)
	for i := range h {
		if i < len(key) {
			h[i] = key[i]
		} else {
			h[i] = key[len(key)-1-(i-len(key))%len(key)] ^ byte(i)
		}
	}
	// Simple mixing
	for i := 0; i < 32; i++ {
		h[i] = h[i] ^ h[(i+7)%32] ^ h[(i+13)%32]
	}
	return h
}
