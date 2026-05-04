# HeaderSearchTable 组件

## 一、组件概述

本组件库位于 `ruoyi-ui/src/components/HeaderSearchTable/` 目录下，包含三个核心文件：

| 文件 | 说明 |
|------|------|
| `index.vue` | 主组件 - 带有表头搜索功能的表格组件 |
| `SearchReset.vue` | 搜索重置按钮组件 |
| `mixins/tableMixin.js` | 通用 Mixin - 提取嵌套属性处理、字典查询等通用方法 |

---

## 二、文件依赖关系

```
┌─────────────────────────────────────────────────────┐
│                    SearchReset.vue                   │
│                  (搜索重置按钮组件)                    │
└─────────────────────┬───────────────────────────────┘
                      │ 依赖
                      ▼
┌─────────────────────────────────────────────────────┐
│                   tableMixin.js                      │
│              (通用方法 Mixin)                          │
│  - 嵌套属性处理 (getNestedValue, setNestedValue)    │
│  - 字典相关方法 (loadDictOptions, findDictKeyInParent) │
│  - 工具方法 (getParentPage, getParentGetList)       │
└─────────────────────┬───────────────────────────────┘
                      │ 引入
                      ▼
┌─────────────────────────────────────────────────────┐
│                    index.vue                         │
│              (HeaderSearchTable 主组件)               │
│  - el-table 表格                                     │
│  - 表头搜索弹窗                                      │
│  - 排序处理                                          │
│  - 搜索历史管理                                      │
│  - VNode 字典自动识别                                │
└─────────────────────────────────────────────────────┘
```

---

## 三、tableMixin.js 核心方法

### 3.1 嵌套属性处理

| 方法 | 说明 |
|------|------|
| `isNestedProperty(property)` | 判断属性是否为嵌套属性（如 `user.name`） |
| `getNestedValue(obj, property)` | 获取嵌套属性的值 |
| `setNestedValue(obj, property, value)` | 设置嵌套属性的值 |

**示例：**
```javascript
// 假设 queryParams = { user: { name: '张三', age: 25 } }
getNestedValue(queryParams, 'user.name') // 返回 '张三'
setNestedValue(queryParams, 'user.name', '李四') // queryParams.user.name 变为 '李四'
```

### 3.2 字典相关方法

| 方法 | 说明 |
|------|------|
| `getParentDictData()` | 获取父组件的字典数据 |
| `getParentDicts()` | 获取父组件声明的 dicts 数组 |
| `findDictKeyInParent(property)` | 在字典数据中查找匹配的 key |
| `loadDictOptions(dictKey, callback)` | 加载字典选项 |

### 3.3 工具方法

| 方法 | 说明 |
|------|------|
| `getTimeRangeParams(property)` | 获取时间字段对应的开始/结束参数名 |
| `checkHasValidValue(fieldType, value)` | 检查是否有有效的搜索值 |
| `hasQueryParams(vm)` | 检查组件是否有 queryParams 属性 |
| `getParentGetList()` | 获取父组件的 getList 方法 |
| `getParentPage()` | 获取父页面组件 |

**分页参数白名单：**
```javascript
pageParams: ['pageNum', 'pageSize', 'orderByColumn', 'isAsc']
```

---

## 四、index.vue 主组件逻辑

### 4.1 组件功能

- 继承 Element UI 的 `el-table` 组件
- 支持点击表头进行搜索（单击表头单元格弹出搜索弹窗）
- 支持多种搜索类型：输入框、下拉选择、日期、日期范围、时间范围
- 支持搜索历史记录（有搜索条件的表头会高亮显示）
- 支持排序（带防抖处理）
- **自动从表格列的 dict-tag 中精确获取字典绑定**（无需任何额外配置）
- 暴露 el-table 的所有方法

### 4.1.1 自动字典匹配（核心功能）

组件会在 `mounted` 时自动分析表格列配置，通过 VNode 精确获取每个列对应的字典。

**工作流程：**
1. 获取 el-table-column 组件实例
2. 执行 `$scopedSlots.default()` 获取 VNode
3. 从 VNode 中找到 dict-tag 组件
4. 提取字典信息：
   - 如果 `options` 是字符串（如 `"dict.type.sys_yes_no"`）→ 直接解析
   - 如果 `options` 是数组（字典已加载）→ 对比已加载的字典数据反向推断

**匹配优先级：**
1. **VNode 精确获取**（最高优先级）- 直接从组件运行时数据获取
2. headerSearchConfig 配置（手动配置）
3. findDictKeyInParent 兜底查找

**无需修改任何页面代码，组件全自动完成！**

### 4.2 核心 Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `data` | Array | `[]` | 表格数据 |
| `loading` | Boolean | `false` | 加载状态 |
| `queryParams` | Object | `{}` | 查询参数 |
| `headerSearchConfig` | Object | `{}` | 表头搜索配置 |
| `localDict` | Object | `{}` | 本地字典数据 |
| `enableSort` | Boolean | `true` | 是否启用排序 |
| `nestedSeparator` | String | `'.'` | 嵌套属性分隔符 |

### 4.3 搜索配置示例

```javascript
// headerSearchConfig 配置示例
headerSearchConfig: {
  // 简单配置 - 指定字典
  status: 'sys_status',
  // 简单配置 - 指定类型
  createTime: 'daterange',
  // 复杂配置
  user: {
    dict: 'sys_user',
    type: 'select'
  }
}
```

### 4.4 核心方法

| 方法 | 说明 |
|------|------|
| `handleHeaderClick(column)` | 处理表头点击，打开搜索弹窗 |
| `loadCurrentValue(property, fieldType)` | 加载当前搜索值 |
| `confirmHeaderSearch()` | 确认搜索，触发查询 |
| `cancelHeaderSearch()` | 取消搜索 |
| `resetSearch()` | 重置搜索（仅清空表头搜索） |
| `resetQueryParams()` | 完全重置查询参数 |

### 4.5 表头高亮样式

当列有搜索条件时，表头会自动添加 `header-search-active` 类名，显示绿色背景：

```css
.header-search-active {
  background-color: #67C23A !important;
  color: #fff !important;
}
```

### 4.6 事件

| 事件名 | 说明 |
|--------|------|
| `header-search` | 表头搜索确认时触发，返回 `{ property, value, queryParams }` |
| 其他事件 | 代理 el-table 的所有事件 |

---

## 五、SearchReset.vue 重置按钮逻辑

### 5.1 功能

提供一个"重置"按钮，自动查找页面中的 `HeaderSearchTable` 组件并重置搜索条件。

### 5.2 查找组件的优先级

1. **检查当前父组件**（弹窗场景）
   - 遍历 `$refs` 查找 `resetSearch` 方法
   - 遍历 `$children` 查找 `HeaderSearchTable` 组件

2. **获取父页面组件**
   - 使用 `getParentPage()` 方法向上查找有 `queryParams` 的组件

3. **常见 ref 名称**
   ```javascript
   const commonRefs = [
     'headerSearchTable',
     'manufacturingTaskTable',
     'table',
     'multipleTable'
   ]
   ```

4. **遍历所有 ref**

5. **遍历 $children**

### 5.3 重置逻辑

```javascript
handleReset() {
  // 1. 优先调用 HeaderSearchTable 的 resetQueryParams（完全重置）
  if (headerSearchTable && headerSearchTable.resetQueryParams) {
    headerSearchTable.resetQueryParams()
    return
  }

  // 2. 兼容旧版：只清空表头搜索
  if (headerSearchTable && headerSearchTable.resetSearch) {
    headerSearchTable.resetSearch()
  }

  // 3. 重置父页面查询参数
  // 3.1 优先调用页面的 resetQuery 方法
  // 3.2 使用 defaultQueryParams 重置
  // 3.3 手动清空（保留分页参数）

  // 4. 刷新列表
  if (parent.getList) {
    parent.getList()
  }
}
```

---

## 六、使用示例

### 6.1 基本用法

```vue
<template>
  <div>
    <!-- 搜索表单 -->
    <el-form :model="queryParams" inline>
      <el-form-item label="名称">
        <el-input v-model="queryParams.name" />
      </el-form-item>
      <SearchReset />
    </el-form>

    <!-- 表格 -->
    <HeaderSearchTable
      ref="headerSearchTable"
      :data="tableData"
      :query-params="queryParams"
      border
      @header-search="handleHeaderSearch">
      <el-table-column type="index" label="序号" width="60" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="status" label="状态">
        <template slot-scope="scope">
          <dict-tag :options="dict.type.sys_status" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" />
    </HeaderSearchTable>
  </div>
</template>

<script>
import HeaderSearchTable from '@/components/HeaderSearchTable'
import SearchReset from '@/components/HeaderSearchTable/SearchReset'

export default {
  components: { HeaderSearchTable, SearchReset },
  dicts: ['sys_status'],
  data() {
    return {
      tableData: [],
      queryParams: {
        name: null,
        status: null,
        startCreateTime: null,
        endCreateTime: null,
        pageNum: 1,
        pageSize: 15
      },
    }
  },
  mounted() {
    this.getList()
  },
  methods: {
    getList() {
      // 获取表格数据
    }
  }
}
</script>
```

### 6.2 自动匹配说明

组件会自动识别表格列中的 `dict-tag` 组件：

```vue
<!-- 这种情况会自动匹配字典，无需额外配置 -->
<el-table-column prop="status" label="状态">
  <template slot-scope="scope">
    <dict-tag :options="dict.type.sys_status" :value="scope.row.status" />
  </template>
</el-table-column>

<!-- 点击"状态"表头时，会自动弹出下拉选择框 -->
```

---

## 七、注意事项

1. **queryParams 必须传递**：组件依赖 `queryParams` 来存储搜索条件和分页信息
2. **defaultQueryParams**：组件会在 `created` 和 `mounted` 时深拷贝 `queryParams` 作为默认参数，用于重置
3. **字典加载**：需要确保父组件或全局字典中有对应的字典数据
4. **SearchReset 组件**：需要在有 `queryParams` 的父组件作用域内使用
5. **事件代理**：组件代理了 el-table 的所有事件，可以在父组件中直接监听
6. **dict-tag 要求**：表格列需要使用 `dict-tag` 组件才能自动识别字典
