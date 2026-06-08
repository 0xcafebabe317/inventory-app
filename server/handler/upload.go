package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"inventory-api/utils"

	"github.com/gin-gonic/gin"
)

type UploadHandler struct{}

func (h *UploadHandler) UploadAvatar(c *gin.Context) {
	userID := c.GetInt64("user_id")

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "请选择图片文件")
		return
	}
	defer file.Close()

	// Validate size (max 5MB)
	if header.Size > 5*1024*1024 {
		utils.Fail(c, 400, "VALIDATION_ERROR", "图片大小不能超过5MB")
		return
	}

	// Validate file extension
	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !allowed[ext] {
		utils.Fail(c, 400, "VALIDATION_ERROR", "仅支持 jpg/png/gif/webp 格式")
		return
	}

	// Validate MIME type by reading file header (magic bytes)
	magicBuf := make([]byte, 512)
	n, _ := file.Read(magicBuf)
	file.Seek(0, io.SeekStart) // Reset for later copy
	mimeType := http.DetectContentType(magicBuf[:n])
	allowedMimes := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/gif":  true,
		"image/webp": true,
	}
	if !allowedMimes[mimeType] {
		utils.Fail(c, 400, "VALIDATION_ERROR", "文件类型不合法，仅支持 jpg/png/gif/webp 格式")
		return
	}

	// Ensure uploads directory exists
	uploadDir := "web/uploads/avatars"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "上传目录创建失败")
		return
	}

	// Generate unique filename with random component to prevent path traversal
	filename := fmt.Sprintf("%d_%d%s", userID, time.Now().UnixNano(), ext)
	savePath := filepath.Join(uploadDir, filepath.Base(filename))

	dst, err := os.Create(savePath)
	if err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "文件保存失败")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "文件写入失败")
		return
	}

	// Return the URL path
	url := "/uploads/avatars/" + filename
	utils.OK(c, gin.H{"url": url})
}
