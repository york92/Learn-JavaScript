const { createApp, ref, reactive, computed, onMounted, watch } = Vue;

const STATUS_OPTIONS = ['在读', '休学', '毕业', '退学'];
const GENDER_OPTIONS = ['男', '女'];

const STATUS_BADGE_CLASS = {
  '在读': 'badge-active',
  '休学': 'badge-leave',
  '毕业': 'badge-graduated',
  '退学': 'badge-dropped'
};

const EMPTY_FORM = () => ({
  id: null,
  student_no: '',
  name: '',
  gender: '男',
  birth_date: '',
  class_name: '',
  major: '',
  phone: '',
  email: '',
  address: '',
  enroll_date: '',
  status: '在读',
  remark: ''
});

const App = {
  setup() {
    // ---------- state ----------
    const students = ref([]);
    const loading = ref(false);
    const pagination = reactive({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
    const filters = reactive({ keyword: '', class_name: '', status: '' });
    const classOptions = ref([]);
    const stats = reactive({ total: 0, byStatus: [], byClass: [] });

    const modalOpen = ref(false);
    const modalMode = ref('create'); // 'create' | 'edit'
    const form = reactive(EMPTY_FORM());
    const formError = ref('');
    const saving = ref(false);

    const confirmOpen = ref(false);
    const confirmTarget = ref(null);
    const deleting = ref(false);

    const toasts = ref([]);
    let toastSeq = 0;

    const now = ref(new Date());

    // ---------- helpers ----------
    function pushToast(message, type = 'success') {
      const id = ++toastSeq;
      toasts.value.push({ id, message, type });
      setTimeout(() => {
        toasts.value = toasts.value.filter((t) => t.id !== id);
      }, 3000);
    }

    async function apiFetch(url, options = {}) {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
      let payload = null;
      const text = await res.text();
      if (text) {
        try { payload = JSON.parse(text); } catch (e) { payload = null; }
      }
      if (!res.ok) {
        const message = (payload && payload.message) || `请求失败 (${res.status})`;
        const err = new Error(message);
        err.payload = payload;
        err.status = res.status;
        throw err;
      }
      return payload;
    }

    // ---------- data loading ----------
    async function loadStudents() {
      loading.value = true;
      try {
        const params = new URLSearchParams({
          page: pagination.page,
          pageSize: pagination.pageSize
        });
        if (filters.keyword) params.set('keyword', filters.keyword);
        if (filters.class_name) params.set('class_name', filters.class_name);
        if (filters.status) params.set('status', filters.status);

        const data = await apiFetch(`/api/students?${params.toString()}`);
        students.value = data.data;
        Object.assign(pagination, data.pagination);
      } catch (err) {
        pushToast(err.message || '加载学生列表失败', 'error');
      } finally {
        loading.value = false;
      }
    }

    async function loadStats() {
      try {
        const data = await apiFetch('/api/students/stats');
        Object.assign(stats, data);
      } catch (err) {
        // 统计信息非关键路径，静默失败
        console.error(err);
      }
    }

    async function loadClasses() {
      try {
        classOptions.value = await apiFetch('/api/classes');
      } catch (err) {
        console.error(err);
      }
    }

    async function refreshAll() {
      await Promise.all([loadStudents(), loadStats(), loadClasses()]);
    }

    // ---------- computed ----------
    const statusStat = (statusName) => {
      const found = stats.byStatus.find((s) => s.status === statusName);
      return found ? found.count : 0;
    };

    const classCount = computed(() => stats.byClass.length);

    const pageInfoText = computed(() => {
      if (pagination.total === 0) return '共 0 条';
      const start = (pagination.page - 1) * pagination.pageSize + 1;
      const end = Math.min(pagination.page * pagination.pageSize, pagination.total);
      return `第 ${start}-${end} 条 · 共 ${pagination.total} 条`;
    });

    // ---------- filters ----------
    let searchDebounce = null;
    watch(() => filters.keyword, () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        pagination.page = 1;
        loadStudents();
      }, 350);
    });

    watch(() => [filters.class_name, filters.status], () => {
      pagination.page = 1;
      loadStudents();
    });

    function resetFilters() {
      filters.keyword = '';
      filters.class_name = '';
      filters.status = '';
      pagination.page = 1;
      loadStudents();
    }

    function goToPage(p) {
      if (p < 1 || p > pagination.totalPages) return;
      pagination.page = p;
      loadStudents();
    }

    // ---------- modal: create / edit ----------
    function openCreateModal() {
      modalMode.value = 'create';
      Object.assign(form, EMPTY_FORM());
      formError.value = '';
      modalOpen.value = true;
    }

    function openEditModal(student) {
      modalMode.value = 'edit';
      Object.assign(form, {
        id: student.id,
        student_no: student.student_no,
        name: student.name,
        gender: student.gender,
        birth_date: student.birth_date || '',
        class_name: student.class_name || '',
        major: student.major || '',
        phone: student.phone || '',
        email: student.email || '',
        address: student.address || '',
        enroll_date: student.enroll_date || '',
        status: student.status,
        remark: student.remark || ''
      });
      formError.value = '';
      modalOpen.value = true;
    }

    function closeModal() {
      if (saving.value) return;
      modalOpen.value = false;
    }

    async function submitForm() {
      formError.value = '';
      if (!form.student_no.trim() || !form.name.trim()) {
        formError.value = '学号和姓名为必填项';
        return;
      }

      saving.value = true;
      const payload = {
        student_no: form.student_no.trim(),
        name: form.name.trim(),
        gender: form.gender,
        birth_date: form.birth_date || '',
        class_name: form.class_name.trim(),
        major: form.major.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        enroll_date: form.enroll_date || '',
        status: form.status,
        remark: form.remark.trim()
      };

      try {
        if (modalMode.value === 'create') {
          await apiFetch('/api/students', { method: 'POST', body: JSON.stringify(payload) });
          pushToast('学生信息已添加');
        } else {
          await apiFetch(`/api/students/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) });
          pushToast('学生信息已更新');
        }
        modalOpen.value = false;
        await refreshAll();
      } catch (err) {
        formError.value = err.message || '保存失败，请重试';
      } finally {
        saving.value = false;
      }
    }

    // ---------- delete ----------
    function askDelete(student) {
      confirmTarget.value = student;
      confirmOpen.value = true;
    }

    function cancelDelete() {
      if (deleting.value) return;
      confirmOpen.value = false;
      confirmTarget.value = null;
    }

    async function confirmDelete() {
      if (!confirmTarget.value) return;
      deleting.value = true;
      try {
        await apiFetch(`/api/students/${confirmTarget.value.id}`, { method: 'DELETE' });
        pushToast(`已删除「${confirmTarget.value.name}」的学籍信息`);
        confirmOpen.value = false;
        confirmTarget.value = null;
        if (students.value.length === 1 && pagination.page > 1) {
          pagination.page -= 1;
        }
        await refreshAll();
      } catch (err) {
        pushToast(err.message || '删除失败', 'error');
      } finally {
        deleting.value = false;
      }
    }

    // ---------- lifecycle ----------
    onMounted(() => {
      refreshAll();
      setInterval(() => { now.value = new Date(); }, 30000);
    });

    return {
      students, loading, pagination, filters, classOptions, stats,
      modalOpen, modalMode, form, formError, saving,
      confirmOpen, confirmTarget, deleting,
      toasts, now,
      STATUS_OPTIONS, GENDER_OPTIONS, STATUS_BADGE_CLASS,
      statusStat, classCount, pageInfoText,
      resetFilters, goToPage,
      openCreateModal, openEditModal, closeModal, submitForm,
      askDelete, cancelDelete, confirmDelete
    };
  },
  template: `
    <div>
      <header class="app-header">
        <div class="brand">
          <div class="brand-seal">籍</div>
          <div class="brand-text">
            <h1>学生信息管理系统</h1>
            <p>STUDENT RECORDS &amp; ROSTER MANAGEMENT</p>
          </div>
        </div>
        <div class="header-meta">
          <div>{{ now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) }}</div>
          <div>在册学生总数 {{ stats.total }} 人</div>
        </div>
      </header>

      <main class="app-body">
        <section class="stat-rail">
          <div class="stat-card">
            <div class="label">在册总数</div>
            <div class="value">{{ stats.total }}</div>
          </div>
          <div class="stat-card accent-jade">
            <div class="label">在读</div>
            <div class="value">{{ statusStat('在读') }}</div>
          </div>
          <div class="stat-card accent-amber">
            <div class="label">休学</div>
            <div class="value">{{ statusStat('休学') }}</div>
          </div>
          <div class="stat-card accent-seal">
            <div class="label">班级数</div>
            <div class="value">{{ classCount }}</div>
          </div>
        </section>

        <div class="toolbar">
          <div class="toolbar-filters">
            <input type="text" v-model="filters.keyword" placeholder="搜索姓名 / 学号" />
            <select v-model="filters.class_name">
              <option value="">全部班级</option>
              <option v-for="c in classOptions" :key="c" :value="c">{{ c }}</option>
            </select>
            <select v-model="filters.status">
              <option value="">全部状态</option>
              <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
            </select>
            <button class="btn-text" @click="resetFilters">重置筛选</button>
          </div>
          <button class="btn btn-primary" @click="openCreateModal">+ 新增学生</button>
        </div>

        <div class="roster-card">
          <table class="roster" v-if="students.length">
            <thead>
              <tr>
                <th>学号</th>
                <th>姓名</th>
                <th>性别</th>
                <th>班级</th>
                <th>专业</th>
                <th>联系电话</th>
                <th>入学日期</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in students" :key="s.id">
                <td class="no-cell">{{ s.student_no }}</td>
                <td class="name-cell">{{ s.name }}</td>
                <td>{{ s.gender }}</td>
                <td>{{ s.class_name || '—' }}</td>
                <td>{{ s.major || '—' }}</td>
                <td>{{ s.phone || '—' }}</td>
                <td>{{ s.enroll_date || '—' }}</td>
                <td><span class="badge" :class="STATUS_BADGE_CLASS[s.status]">{{ s.status }}</span></td>
                <td class="row-actions">
                  <button class="btn btn-outline btn-sm" @click="openEditModal(s)">编辑</button>
                  <button class="btn btn-danger btn-sm" @click="askDelete(s)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="empty-state" v-else>
            <div class="glyph">📋</div>
            <p v-if="loading">正在加载学籍数据…</p>
            <p v-else>暂无符合条件的学生记录</p>
          </div>

          <div class="pagination" v-if="students.length">
            <span>{{ pageInfoText }}</span>
            <div class="pager-btns">
              <button class="btn btn-outline btn-sm" :disabled="pagination.page <= 1" @click="goToPage(pagination.page - 1)">上一页</button>
              <span>{{ pagination.page }} / {{ pagination.totalPages }}</span>
              <button class="btn btn-outline btn-sm" :disabled="pagination.page >= pagination.totalPages" @click="goToPage(pagination.page + 1)">下一页</button>
            </div>
          </div>
        </div>
      </main>

      <footer class="app-footer">轻量学生信息管理系统 · Fastify + Vue3 + SQLite</footer>

      <!-- 新增 / 编辑弹窗 -->
      <div class="modal-mask" v-if="modalOpen" @click.self="closeModal">
        <div class="modal-panel">
          <div class="modal-header">
            <h2>{{ modalMode === 'create' ? '新增学生' : '编辑学生信息' }}</h2>
            <button class="modal-close" @click="closeModal">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-error" v-if="formError">{{ formError }}</div>
            <div class="form-grid">
              <div class="form-field">
                <label>学号 <span class="req">*</span></label>
                <input type="text" v-model="form.student_no" placeholder="如 2024001" />
              </div>
              <div class="form-field">
                <label>姓名 <span class="req">*</span></label>
                <input type="text" v-model="form.name" placeholder="学生姓名" />
              </div>
              <div class="form-field">
                <label>性别</label>
                <select v-model="form.gender">
                  <option v-for="g in GENDER_OPTIONS" :key="g" :value="g">{{ g }}</option>
                </select>
              </div>
              <div class="form-field">
                <label>出生日期</label>
                <input type="date" v-model="form.birth_date" />
              </div>
              <div class="form-field">
                <label>班级</label>
                <input type="text" v-model="form.class_name" placeholder="如 计算机2401班" />
              </div>
              <div class="form-field">
                <label>专业</label>
                <input type="text" v-model="form.major" placeholder="如 计算机科学与技术" />
              </div>
              <div class="form-field">
                <label>联系电话</label>
                <input type="text" v-model="form.phone" placeholder="手机号码" />
              </div>
              <div class="form-field">
                <label>邮箱</label>
                <input type="text" v-model="form.email" placeholder="电子邮箱" />
              </div>
              <div class="form-field">
                <label>入学日期</label>
                <input type="date" v-model="form.enroll_date" />
              </div>
              <div class="form-field">
                <label>学籍状态</label>
                <select v-model="form.status">
                  <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <div class="form-field full">
                <label>家庭住址</label>
                <input type="text" v-model="form.address" placeholder="现居住地址" />
              </div>
              <div class="form-field full">
                <label>备注</label>
                <textarea v-model="form.remark" placeholder="奖惩、干部职务等备注信息"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="closeModal" :disabled="saving">取消</button>
            <button class="btn btn-primary" @click="submitForm" :disabled="saving">{{ saving ? '保存中…' : '保存' }}</button>
          </div>
        </div>
      </div>

      <!-- 删除确认弹窗 -->
      <div class="modal-mask" v-if="confirmOpen" @click.self="cancelDelete">
        <div class="modal-panel confirm-panel">
          <div class="modal-header">
            <h2>删除确认</h2>
            <button class="modal-close" @click="cancelDelete">✕</button>
          </div>
          <div class="confirm-body">
            确定要删除学生「{{ confirmTarget && confirmTarget.name }}」（学号 {{ confirmTarget && confirmTarget.student_no }}）的学籍记录吗？此操作不可撤销。
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="cancelDelete" :disabled="deleting">取消</button>
            <button class="btn btn-danger" @click="confirmDelete" :disabled="deleting">{{ deleting ? '删除中…' : '确认删除' }}</button>
          </div>
        </div>
      </div>

      <!-- Toast -->
      <div class="toast-stack">
        <div class="toast" :class="t.type" v-for="t in toasts" :key="t.id">{{ t.message }}</div>
      </div>
    </div>
  `
};

createApp(App).mount('#app');
