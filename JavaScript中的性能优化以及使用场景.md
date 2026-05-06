## JavaScript中性能优化主要几大块：
- 内存管理
- DOM操作
- 异步优化
- 计算优化
- 网络与加载

**内存管理**

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


**DOM操作**
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
**异步优化**

**计算优化**


**网络与加载**
