<template>
  <el-dialog
    :model-value="visible"
    title="开通/续费权限"
    width="520px"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div v-if="user">
      <el-descriptions :column="1" border size="small" style="margin-bottom:20px">
        <el-descriptions-item label="用户">{{ user.nickname || '用户' + user.id }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ user.phone || user.phone_masked }}</el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :type="statusType(user.subscription_status)" size="small">
            {{ statusLabel(user.subscription_status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="当前到期" v-if="user.subscription_expires_at">
          {{ formatDate(user.subscription_expires_at) }}
        </el-descriptions-item>
      </el-descriptions>

      <el-form :model="form" label-width="80px">
        <el-form-item label="套餐选择">
          <el-radio-group v-model="form.plan" @change="onPlanChange">
            <el-radio value="custom">自定义</el-radio>
            <el-radio value="monthly">月卡</el-radio>
            <el-radio value="quarterly">季卡</el-radio>
            <el-radio value="yearly">年卡</el-radio>
            <el-radio value="permanent">永久</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="到期时间" v-if="form.plan === 'custom'">
          <el-date-picker
            v-model="form.expires_at"
            type="date"
            placeholder="请选择到期时间"
            value-format="YYYY-MM-DD"
            style="width:100%"
          />
        </el-form-item>

        <el-form-item label="到期时间" v-else>
          <el-input :model-value="calcPreview" disabled />
          <span class="hint">{{ calcHint }}</span>
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model="form.remark" placeholder="可选" />
        </el-form-item>
      </el-form>

      <!-- 提交确认信息 -->
      <el-alert
        v-if="submitPreview"
        :title="submitPreview"
        type="success"
        :closable="false"
        show-icon
        style="margin-top: 8px"
      />
    </div>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { activateUser } from '../api/admin'
import { ElMessage } from 'element-plus'

const props = defineProps<{ visible: boolean; user: any }>()
const emit = defineEmits(['update:visible', 'success'])

const submitting = ref(false)
const form = reactive({ plan: 'monthly', expires_at: '', remark: '' })

watch(() => props.visible, (v) => {
  if (v) {
    form.plan = 'monthly'
    form.expires_at = ''
    form.remark = ''
  }
})

function onPlanChange(_plan: string) {
  form.expires_at = ''
}

const calcPreview = computed(() => {
  if (form.plan === 'custom') return '请选择日期'
  const base = getBaseDate()
  const d = new Date(base)
  switch (form.plan) {
    case 'monthly': d.setDate(d.getDate() + 30); break
    case 'quarterly': d.setDate(d.getDate() + 90); break
    case 'yearly': d.setDate(d.getDate() + 365); break
    case 'permanent': d.setFullYear(d.getFullYear() + 99); break
  }
  return d.toLocaleDateString('zh-CN')
})

const calcHint = computed(() => {
  const base = getBaseDate()
  const baseStr = new Date(base).toLocaleDateString('zh-CN')
  const todayStr = new Date().toLocaleDateString('zh-CN')
  if (baseStr > todayStr) return `从当前到期日 ${baseStr} 起算`
  return `从今天 (${todayStr}) 起算`
})

/** 提交前显示确认信息 */
const submitPreview = computed(() => {
  if (form.plan === 'custom') {
    if (!form.expires_at) return ''
    return `确认开通：自定义套餐，到期时间 ${new Date(form.expires_at).toLocaleDateString('zh-CN')}`
  }
  const planNames: Record<string, string> = {
    monthly: '月卡 (+30天)',
    quarterly: '季卡 (+90天)',
    yearly: '年卡 (+365天)',
    permanent: '永久 (+99年)'
  }
  return `确认开通：${planNames[form.plan] || form.plan}，到期时间 ${calcPreview.value}`
})

function getBaseDate(): string {
  if (props.user?.subscription_expires_at) {
    const d = new Date(props.user.subscription_expires_at)
    if (d > new Date()) return props.user.subscription_expires_at
  }
  return new Date().toISOString().split('T')[0]
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('zh-CN')
}

function statusLabel(s: string) {
  const map: Record<string, string> = { trial: '试用中', active: '已开通', expired: '已到期', disabled: '已停用' }
  return map[s] || s
}

function statusType(s: string) {
  const map: Record<string, string> = { trial: 'warning', active: 'success', expired: 'danger', disabled: 'info' }
  return map[s] || 'info'
}

function submit() {
  if (form.plan === 'custom' && !form.expires_at) {
    ElMessage.warning('自定义套餐请选择到期时间')
    return
  }
  submitting.value = true
  const data: any = {
    plan: form.plan,
    remark: form.remark
  }
  if (form.plan === 'custom') {
    data.expires_at = form.expires_at
  }
  activateUser(props.user.id, data)
    .then(() => {
      ElMessage.success('操作成功')
      emit('update:visible', false)
      emit('success')
    })
    .finally(() => submitting.value = false)
}
</script>

<style scoped>
.hint { font-size: 12px; color: #909399; display: block; margin-top: 4px; }
</style>
