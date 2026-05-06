## JavaScript中性能优化主要几大块：
- 内存管理
- DOM操作
- 异步优化
- 计算优化
- 网络与加载

**1、内存管理**

内存泄漏，事件监听器没有移除：
- 组件销毁时没有清理事件监听，导致闭包持续占用内存，常见于SPA路由切换场景。比如：
```
window.addEventListener('resize', handler)
// 组件卸载时、一定要移除：
window.removeEventListener('resize', handler)
使用场景：vue、react组件生命周期、路由切换。
```
- 避免闭包导致的意外引用：定时器回调闭包会持有外部变量引用，阻止GC，定时器需要在合适的时候清除：
```
let bigData = new Array(1e6).fill(0)

// ❌ bigData 无法被回收
const timer = setInterval(() => {
  console.log(bigData.length)
}, 1000)

// ✅ 用完后清除
clearInterval(timer)
bigData = null
```


**2、DOM操作**
- 批量DOM操作，DocumentFragment每次dom修改都可能触发重排，使用DocumentFragment 在内存中构建完整结构，再一次性插入，
```
//触发100次重排
for (let i = 0; i < 1000; i++) {
  const li = document.createElement('li')
  li.textContent = i
  list.appendChild(li) // 每次触发重排
}

//只会触发一次重排
const frag = document.createDocumentFragment()
for (let i = 0; i < 1000; i++) {
  const li = document.createElement('li')
  li.textContent = i
  frag.appendChild(li)
}
list.appendChild(frag) // 一次性插入
```
- 事件委托：把子元素的事件监听提升到父元素，减少监听器数量，动态新增子元素也自动生效：
```
// ✅ 只绑定一个监听器
list.addEventListener('click', (e) => {
  const item = e.target.closest('.item')
  if (item) handleClick(item.dataset.id)
})
```
**3、异步优化**
- 防抖：高频触发事件（输入，resize），只在停止触发后的延迟时间执行，避免重复调用开销大的操作；
```
  function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// 用户停止输入 300ms 后才发起搜索请求
input.addEventListener('input', debounce(search, 300))
```
- 节流：保证在规定时间间隔内、最多执行一次，适用于需要固定频率响应的场景；
```
function throttle(fn, interval) {
  let last = 0
  return (...args) => {
    const now = Date.now()
    if (now - last >= interval) {
      last = now
      fn(...args)
    }
  }
}

// 滚动时每 100ms 最多更新一次位置
window.addEventListener('scroll', throttle(updatePos, 100))
//使用场景有：滚动监听、鼠标移动轨迹、游戏帧更新。
```

**4、计算优化**
- 缓存纯函数结果：对相同输入缓存计算结果，避免重复计算，适用于无副作用的纯函数：
```
function memoize(fn) {
  const cache = new Map()
  return (...args) => {
    const key = JSON.stringify(args)
    if (cache.has(key)) return cache.get(key)
    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

const fib = memoize(n => n <= 1 ? n : fib(n-1) + fib(n-2))
```
- 虚拟列表、虚拟滚动：只渲染可视区域的内的dom节点，列表无论多长内存占用恒定，大幅提升渲染性能：
```
// 核心思路：计算可见范围
const visibleStart = Math.floor(scrollTop / itemH)
const visibleEnd = visibleStart + Math.ceil(viewH / itemH)

// 只渲染 [visibleStart, visibleEnd] 区间内的条目
// 容器用 paddingTop 模拟已滚过的高度
//适用场景：10万+行表格、消息列表、商品列表；
```
- 避免不必要的深拷贝，json序列化深拷贝 性能差而且有性能限制，优先使用结构化克隆或者浅拷贝 + 精准更新；


**5、网络与加载**
- 懒加载：路由级代码分割 + 图片懒加载， 减少首屏的资源体积，加快可交互时间：
```
// React 路由懒加载
const Dashboard = React.lazy(() => import('./Dashboard'))

// 图片原生懒加载
<img src="photo.jpg" loading="lazy" />

// Intersection Observer 懒加载
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.src = e.target.dataset.src
      observer.unobserve(e.target)
    }
  })
})
//适用场景有SPA路由、图片画廊、电商商品图；
```
