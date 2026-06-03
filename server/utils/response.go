package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, Response{Code: "OK", Message: "success", Data: data})
}

func Fail(c *gin.Context, httpStatus int, code, message string) {
	c.JSON(httpStatus, Response{Code: code, Message: message})
}

func FailWithData(c *gin.Context, httpStatus int, code, message string, data any) {
	c.JSON(httpStatus, Response{Code: code, Message: message, Data: data})
}
