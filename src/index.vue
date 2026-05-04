<template>
  <div class="header-search-table" :key="tableKey">
    <!-- 表格组件 -->
    <el-table
      ref="tableRef"
      :key="tableKey"
      v-loading="loading"
      :data="data"
      v-bind="$attrs"
      :row-style="rowStyle"
      :header-cell-class-name="headerCellClassName"
      @header-click="handleHeaderClick"
      @sort-change="handleSortChange"
      @filter-change="$emit('filter-change', $event)"
      @cell-mouse-enter="$emit('cell-mouse-enter', $event)"
      @cell-mouse-leave="$emit('cell-mouse-leave', $event)"
      @cell-click="$emit('cell-click', $event)"
      @cell-dblclick="$emit('cell-dblclick', $event)"
      @row-click="$emit('row-click', $event)"
      @row-dblclick="$emit('row-dblclick', $event)"
      @selection-change="$emit('selection-change', $event)"
      @header-contextmenu="$emit('header-contextmenu', $event)">
      <slot></slot>
    </el-table>

    <!-- 表头搜索弹窗 -->
    <el-dialog
      title=""
      :visible.sync="headerSearchVisible"
      width="320px"
      append-to-body
      :close-on-click-modal="false"
      class="header-search-dialog">
      <div class="header-search-box">
        <div class="header-search-title">{{ headerSearchColumn ? headerSearchColumn.label : '' }}</div>

        <!-- 下拉选择 -->
        <el-select
          v-if="headerSearchType === 'select'"
          ref="headerSearchSelect"
          v-model="headerSearchValue"
          placeholder="请选择"
          clearable
          style="width: 100%; margin-bottom: 10px;">
          <el-option
            v-for="item in headerSearchOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value" />
        </el-select>

        <!-- 日期时间范围 -->
        <el-date-picker
          v-else-if="headerSearchType === 'datetimerange'"
          v-model="headerSearchValue"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          value-format="yyyy-MM-dd HH:mm:ss"
          style="width: 100%; margin-bottom: 10px;"
          @keyup.enter.native="confirmHeaderSearch" />

        <!-- 日期范围 -->
        <el-date-picker
          v-else-if="headerSearchType === 'daterange'"
          v-model="headerSearchValue"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="yyyy-MM-dd"
          style="width: 100%; margin-bottom: 10px;"
          @keyup.enter.native="confirmHeaderSearch" />

        <!-- 单个日期 -->
        <el-date-picker
          v-else-if="headerSearchType === 'date'"
          v-model="headerSearchValue"
          type="datetime"
          placeholder="请选择时间"
          value-format="yyyy-MM-dd HH:mm:ss"
          clearable
          style="width: 100%; margin-bottom: 10px;"
          @keyup.enter.native="confirmHeaderSearch" />

        <!-- 输入框 -->
        <el-input
          v-else
          ref="headerSearchInput"
          v-model="headerSearchValue"
          :placeholder="'请输入' + (headerSearchColumn ? headerSearchColumn.label : '')"
          clearable
          @keyup.enter.native="confirmHeaderSearch" />
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="cancelHeaderSearch">取消</el-button>
        <el-button type="primary" @click="confirmHeaderSearch">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import tableMixin from './mixins/tableMixin'

/**
 * HeaderSearchTable 组件
 * 带有表头搜索功能的表格组件
 * 使用方式：<HeaderSearchTable :query-params="queryParams" ref="headerSearchTable">
 */
export default {
  name: 'HeaderSearchTable',

  mixins: [tableMixin],

  props: {
    data: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    tableKey: { type: [Number, String], default: 0 },
    queryParams: { type: Object, default: () => ({}) },
    headerSearchConfig: { type: Object, default: () => ({}) },
    localDict: { type: Object, default: () => ({}) },
    rowStyle: { type: Function, default: null },
    nestedSeparator: { type: String, default: '.' },
    enableSort: { type: Boolean, default: true },
    sortDebounceDelay: { type: Number, default: 300 }
  },

  computed: {
    // 暴露 el-table 的选中数据
    selection() {
      return this.$refs.tableRef && this.$refs.tableRef.selection ? this.$refs.tableRef.selection : []
    },
    selectionRows() {
      return this.$refs.tableRef && this.$refs.tableRef.selection ? this.$refs.tableRef.selection : []
    },
    currentRow() {
      return this.$refs.tableRef && this.$refs.tableRef.currentRow ? this.$refs.tableRef.currentRow : null
    }
  },

  data() {
    return {
      headerSearchVisible: false,
      headerSearchColumn: null,
      headerSearchType: 'input',
      headerSearchValue: null,
      headerSearchOptions: [],
      searchHistory: [],
      defaultQueryParams: null,
      sortDebounceTimer: null,
      columnDictMap: {}
    }
  },

  created() {
    if (this.queryParams) {
      this.defaultQueryParams = JSON.parse(JSON.stringify(this.queryParams))
    }
  },

  mounted() {
    if (!this.defaultQueryParams && this.queryParams) {
      this.defaultQueryParams = JSON.parse(JSON.stringify(this.queryParams))
    }
    this.$nextTick(() => {
      this.analyzeTableColumns()
    })
  },

  watch: {
    headerSearchVisible(val) {
      if (val) {
        this.$nextTick(() => {
          const inputRef = this.$refs.headerSearchInput
          if (inputRef && inputRef.focus) {
            inputRef.focus()
            inputRef.select()
          }
          if (this.headerSearchType === 'select') {
            const selectRef = this.$refs.headerSearchSelect
            if (selectRef && selectRef.visible) {
              selectRef.visible = true
            }
          }
        })
      }
    },
    queryParams: {
      handler(newVal) {
        if (!newVal) return
        const searchFields = this.searchHistory.map(h => h.param || h.property)
        const allCleared = searchFields.every(field => {
          const value = this.getNestedValue(newVal, field)
          return value === null || value === undefined || value === ''
        })
        if (allCleared && searchFields.length > 0) {
          this.searchHistory = []
          this.$nextTick(() => {
            const tableRef = this.$refs.tableRef
            if (tableRef && tableRef.$forceUpdate) {
              tableRef.$forceUpdate()
            }
          })
        }
      },
      deep: true
    }
  },

  methods: {
    // ==================== 表格列字典分析 ====================

    /**
     * 分析表格列配置，自动建立列属性到字典的映射
     * 策略: 从 el-table 的 $children 获取 el-table-column 组件实例
     */
    analyzeTableColumns(retryCount = 0) {
      const maxRetries = 10
      if (retryCount >= maxRetries) {
        return
      }

      if (Object.keys(this.columnDictMap).length > 0) {
        return
      }

      const tableRef = this.$refs.tableRef
      if (!tableRef) {
        setTimeout(() => this.analyzeTableColumns(retryCount + 1), 300)
        return
      }

      const children = tableRef.$children
      const columnDictMap = {}

      children.forEach((child) => {
        if (child.$options && child.$options.name === 'ElTableColumn') {
          const prop = child.prop

          if (child.$scopedSlots && child.$scopedSlots.default) {
            const slotFn = child.$scopedSlots.default
            try {
              const mockScope = { row: { status: 1, isInvoice: 1, isPay: 1 }, $index: 0 }
              const vnode = slotFn(mockScope)

              if (Array.isArray(vnode)) {
                const dictResult = this.findDictTagInVnodeArray(vnode, prop)
                if (dictResult) {
                  columnDictMap[prop] = dictResult
                }
              }
            } catch (e) {}
          }
        }
      })

      if (Object.keys(columnDictMap).length === 0 && retryCount < maxRetries - 1) {
        setTimeout(() => this.analyzeTableColumns(retryCount + 1), (retryCount + 1) * 500)
        return
      }

      this.columnDictMap = JSON.parse(JSON.stringify(columnDictMap))
    },

    /**
     * 在 VNode 数组中查找 dict-tag 组件并提取字典名
     */
    findDictTagInVnodeArray(vnodes, prop) {
      if (!vnodes || !Array.isArray(vnodes)) return null

      for (const vnode of vnodes) {
        const result = this.findDictTagInVnode(vnode, prop)
        if (result) return result
      }
      return null
    },

    /**
     * 在单个 VNode 中查找 dict-tag 组件并提取字典名
     */
    findDictTagInVnode(vnode, prop) {
      if (!vnode) return null

      const isDictTag = (vnode.tag && (
        vnode.tag.toLowerCase().includes('dict-tag') ||
        vnode.tag.includes('DictTag')
      ))

      const componentName = vnode.componentOptions &&
        vnode.componentOptions.Ctor &&
        vnode.componentOptions.Ctor.options &&
        vnode.componentOptions.Ctor.options.name

      const isDictTagByName = componentName === 'DictTag'

      if (isDictTag || isDictTagByName) {
        if (vnode.componentOptions && vnode.componentOptions.propsData) {
          const options = vnode.componentOptions.propsData.options

          if (options) {
            if (typeof options === 'string') {
              if (options.startsWith('dict.type.')) {
                return options.replace('dict.type.', '')
              }
              if (options.startsWith('dict.')) {
                return options.replace('dict.', '')
              }
            }
            else if (Array.isArray(options) && options.length > 0) {
              const dictKey = this.reverseFindDictKey(options, prop)
              if (dictKey) return dictKey
            }
          }
        }
      }

      if (vnode.children && Array.isArray(vnode.children)) {
        return this.findDictTagInVnodeArray(vnode.children, prop)
      }

      return null
    },

    /**
     * 从已加载的字典数组反向推断字典名
     */
    reverseFindDictKey(optionsArray, prop) {
      const parentDictData = this.getParentDictData()
      const parentDicts = this.getParentDicts()

      if (!parentDictData && !this.$dict) return null

      const dictKeys = parentDicts || []

      for (const dictKey of dictKeys) {
        const dictData = parentDictData ? parentDictData[dictKey] : (this.$dict ? this.$dict.data[dictKey] : null)

        if (!dictData || !Array.isArray(dictData)) continue

        if (dictData.length === optionsArray.length) {
          const isMatch = dictData.every((item, index) => {
            return item.value === optionsArray[index].value &&
                   item.label === optionsArray[index].label
          })

          if (isMatch) return dictKey
        }
      }

      return null
    },

    /**
     * 从 vnode 中提取 dict-tag 使用的字典名
     */
    extractDictFromVnode(vnode, property) {
      if (!vnode) return null

      // 处理数组
      if (Array.isArray(vnode)) {
        for (const item of vnode) {
          const result = this.extractDictFromVnode(item, property)
          if (result) return result
        }
        return null
      }

      // 检查是否是 dict-tag 组件
      if (vnode.tag && vnode.tag.toLowerCase().includes('dict-tag')) {
        const props = vnode.data && vnode.data.props
        if (props && props.options) {
          const options = props.options

          // 解析字典名
          if (typeof options === 'string' && options.startsWith('dict.type.')) {
            return options.replace('dict.type.', '')
          }
        }
      }

      // 递归检查 children - 支持多种格式
      if (vnode.children) {
        if (Array.isArray(vnode.children)) {
          return this.extractDictFromVnode(vnode.children, property)
        } else if (typeof vnode.children === 'object' && vnode.children.default) {
          return this.extractDictFromVnode(vnode.children.default, property)
        }
      }

      // 检查 slot
      if (vnode.data && vnode.data.scopedSlots && vnode.data.scopedSlots.default) {
        const slotFn = vnode.data.scopedSlots.default
        if (typeof slotFn === 'function') {
          const slotVNode = slotFn({})
          return this.extractDictFromVnode(slotVNode, property)
        }
      }

      return null
    },

    /**
     * 从 vnode 中提取 dict-tag 的字典名
     */
    extractDictFromVNode(vnode, columnDictMap, fallbackProperty) {
      if (!vnode) return

      // 处理数组
      if (Array.isArray(vnode)) {
        vnode.forEach(v => this.extractDictFromVNode(v, columnDictMap, fallbackProperty))
        return
      }

      // 检查是否是 dict-tag 组件
      if (vnode.tag && vnode.tag.includes('dict-tag')) {
        // 从 data.props 中获取 options
        const props = vnode.data && vnode.data.props
        if (props && props.options) {
          const options = props.options

          // 如果 options 是字符串格式 dict.type.xxx
          if (typeof options === 'string' && options.startsWith('dict.type.')) {
            const dictName = options.replace('dict.type.', '')
            columnDictMap[fallbackProperty] = dictName
          }
          // 如果 options 已经是解析后的数组（字典数据）
          else if (Array.isArray(options) && options.length > 0) {
            // 从父级获取 prop - 这里无法直接获取，尝试从 data.attrs 中获取
            // 由于无法确定字段名，暂时跳过
          }
        }
      }

      // 递归检查 children
      if (vnode.children) {
        this.extractDictFromVNode(vnode.children, columnDictMap, fallbackProperty)
      }
    },

    // ==================== 排序处理 ====================

    handleSortChange(column) {
      if (!this.enableSort) {
        this.$emit('sort-change', column)
        return
      }
      if (!column.prop) return

      if (this.queryParams) {
        this.queryParams.orderByColumn = column.prop
        this.queryParams.isAsc = column.order === 'descending' ? 'desc' : 'asc'
      }
      this.$emit('sort-change', column)

      if (this.sortDebounceTimer) clearTimeout(this.sortDebounceTimer)
      this.sortDebounceTimer = setTimeout(() => {
        const parentGetList = this.getParentGetList()
        if (parentGetList) {
          parentGetList()
        }
      }, this.sortDebounceDelay)
    },

    // ==================== 表头样式 ====================

    headerCellClassName({ column }) {
      const property = column.property
      if (!property) return ''

      // 检查搜索历史
      const hasSearch = this.searchHistory.some(record => {
        if (record.property === property) return true
        if (this.isNestedProperty(property)) {
          return record.property === property.split(this.nestedSeparator).pop()
        }
        return false
      })
      if (hasSearch) return 'header-search-active'

      // 检查 queryParams
      if (this.queryParams && property in this.queryParams) {
        const val = this.queryParams[property]
        if (val !== null && val !== undefined && val !== '') {
          if (Array.isArray(val) && val.length > 0) return 'header-search-active'
          if (!Array.isArray(val)) return 'header-search-active'
        }
      }
      return ''
    },

    // ==================== el-table 代理方法 ====================

    toggleRowSelection(...args) {
      const tableRef = this.$refs.tableRef
      return tableRef ? tableRef.toggleRowSelection(...args) : null
    },
    toggleAllSelection() {
      const tableRef = this.$refs.tableRef
      return tableRef ? tableRef.toggleAllSelection() : null
    },
    clearSelection() {
      const tableRef = this.$refs.tableRef
      return tableRef ? tableRef.clearSelection() : null
    },
    setCurrentRow(row) {
      const tableRef = this.$refs.tableRef
      return tableRef ? tableRef.setCurrentRow(row) : null
    },
    clearSort() {
      const tableRef = this.$refs.tableRef
      return tableRef ? tableRef.clearSort() : null
    },
    clearFilter(keys) {
      const tableRef = this.$refs.tableRef
      return tableRef ? tableRef.clearFilter(keys) : null
    },
    sort(prop, order) {
      const tableRef = this.$refs.tableRef
      return tableRef ? tableRef.sort(prop, order) : null
    },
    doLayout() {
      const tableRef = this.$refs.tableRef
      return tableRef ? tableRef.doLayout() : null
    },
    getSelectionRows() {
      const tableRef = this.$refs.tableRef
      return tableRef ? tableRef.getSelectionRows() : []
    },
    toggleRowExpansion(...args) {
      const tableRef = this.$refs.tableRef
      return tableRef ? tableRef.toggleRowExpansion(...args) : null
    },
    scrollTo(...args) {
      const tableRef = this.$refs.tableRef
      return tableRef ? tableRef.scrollTo(...args) : null
    },

    // ==================== 字段类型推断 ====================

    /**
     * 根据字段名推断类型
     * @param {String} property - 字段名
     * @return {String} 类型
     */
    inferFieldType(property) {
      const lower = property.toLowerCase()
      if (['time', 'date', 'dt'].some(p => lower.includes(p))) {
        return 'daterange'
      }
      return 'input'
    },

    // ==================== 搜索历史管理 ====================

    addToSearchHistory(record) {
      const idx = this.searchHistory.findIndex(item => item.property === record.property)
      if (idx > -1) {
        this.searchHistory[idx] = record
      } else {
        this.searchHistory.push(record)
      }
    },

    removeFromSearchHistory(property) {
      const idx = this.searchHistory.findIndex(item => item.property === property)
      if (idx > -1) this.searchHistory.splice(idx, 1)
    },

    // ==================== 表头搜索处理 ====================

    /**
     * 检测嵌套参数路径
     * @param {String} property - 嵌套属性名
     * @return {String} 参数路径
     */
    detectNestedParamPath(property) {
      if (!this.queryParams || !this.isNestedProperty(property)) return property

      const keys = property.split(this.nestedSeparator)
      let current = this.queryParams
      let exists = true

      for (const key of keys) {
        if (!current || current[key] === undefined || current[key] === null) {
          exists = false
          break
        }
        current = current[key]
      }
      if (exists) return property

      const firstKey = keys[0]
      if (this.queryParams[firstKey] && typeof this.queryParams[firstKey] === 'object') {
        if (keys.length > 1 && this.queryParams[firstKey][keys[1]] !== undefined) {
          return property
        }
        return firstKey
      }
      return keys[keys.length - 1]
    },

    /**
     * 处理表头点击
     * @param {Object} column - 列信息
     */
    handleHeaderClick(column) {
      if (['selection', 'index'].includes(column.type) || column.label === '操作') return

      const property = column.property
      let dictKey = null
      let fieldType = 'input'
      const baseProperty = this.isNestedProperty(property) ? property.split(this.nestedSeparator).pop() : property

      let paramName = property
      if (this.isNestedProperty(property)) {
        paramName = this.detectNestedParamPath(property) || property
      }

      const searchConfig = this.headerSearchConfig[property] || this.headerSearchConfig[baseProperty]
      if (searchConfig && searchConfig.param) paramName = searchConfig.param

      if (searchConfig) {
        if (typeof searchConfig === 'string') {
          if (['date', 'daterange', 'datetime'].includes(searchConfig)) {
            fieldType = searchConfig
          } else {
            dictKey = searchConfig
            fieldType = 'select'
          }
        } else if (typeof searchConfig === 'object') {
          dictKey = searchConfig.dict
          fieldType = searchConfig.type || this.inferFieldType(baseProperty)
        }
      } else {
        dictKey = this.columnDictMap[baseProperty]

        if (!dictKey) {
          dictKey = this.columnDictMap[property]
        }

        if (!dictKey && this.queryParams) {
          const queryKeys = Object.keys(this.queryParams)
          for (const key of queryKeys) {
            if (key === property || key.toLowerCase() === property.toLowerCase()) {
              dictKey = this.columnDictMap[key]
              paramName = key
              break
            }
          }
        }

        if (dictKey) {
          fieldType = 'select'
        } else {
          dictKey = this.findDictKeyInParent(baseProperty)
          if (dictKey) {
            fieldType = 'select'
          } else {
            fieldType = this.inferFieldType(baseProperty)
          }
        }
      }

      this.headerSearchType = fieldType
      this.headerSearchColumn = { property, param: paramName, label: column.label }

      // 加载选项
      if (fieldType === 'select') {
        this.loadDictOptions(dictKey, (options) => {
          this.headerSearchOptions = options
        })
      } else {
        this.headerSearchOptions = []
      }

      // 加载当前值
      this.loadCurrentValue(paramName, fieldType)
      this.headerSearchVisible = true
    },

    /**
     * 加载当前搜索值
     * @param {String} property - 字段名
     * @param {String} fieldType - 字段类型
     */
    loadCurrentValue(property, fieldType) {
      if (fieldType === 'daterange') {
        const { startParam, endParam } = this.getTimeRangeParams(property)
        let startValue = this.getNestedValue(this.queryParams, startParam)
        let endValue = this.getNestedValue(this.queryParams, endParam)
        if (startValue && endValue) {
          if (startValue.length > 10) startValue = startValue.substring(0, 10)
          if (endValue.length > 10) endValue = endValue.substring(0, 10)
          this.headerSearchValue = [startValue, endValue]
        } else {
          this.headerSearchValue = null
        }
      } else {
        this.headerSearchValue = this.queryParams ? this.getNestedValue(this.queryParams, property) : null
      }
    },

    /**
     * 确认搜索
     */
    confirmHeaderSearch() {
      if (!this.headerSearchColumn) return

      const { property, param } = this.headerSearchColumn
      const queryParam = param || property
      let searchRecord = { property, param: queryParam }

      if (this.headerSearchType === 'daterange') {
        const { startParam, endParam } = this.getTimeRangeParams(queryParam)
        if (this.headerSearchValue && this.headerSearchValue.length === 2) {
          let start = this.headerSearchValue[0]
          let end = this.headerSearchValue[1]
          if (start.length === 10) start += ' 00:00:00'
          if (end.length === 10) end += ' 23:59:59'
          this.setNestedValue(this.queryParams, startParam, start)
          this.setNestedValue(this.queryParams, endParam, end)
          searchRecord.startParam = startParam
          searchRecord.endParam = endParam
        } else {
          const { startParam, endParam } = this.getTimeRangeParams(queryParam)
          this.setNestedValue(this.queryParams, startParam, null)
          this.setNestedValue(this.queryParams, endParam, null)
        }
      } else {
        if (this.headerSearchValue !== null && this.headerSearchValue !== '') {
          this.setNestedValue(this.queryParams, queryParam, this.headerSearchValue)
        } else {
          this.queryParams[queryParam] = null
        }
      }

      // 更新搜索历史
      if (this.checkHasValidValue(this.headerSearchType, this.headerSearchValue)) {
        this.addToSearchHistory(searchRecord)
      } else {
        this.removeFromSearchHistory(property)
      }

      // 重置分页
      if (this.queryParams.pageNum) this.queryParams.pageNum = 1

      // 触发事件
      this.$emit('header-search', { property, value: this.headerSearchValue, queryParams: this.queryParams })
      const parentGetList = this.getParentGetList()
      if (parentGetList) {
        parentGetList()
      }

      this.headerSearchVisible = false
    },

    cancelHeaderSearch() {
      this.headerSearchVisible = false
    },

    // ==================== 对外方法 ====================

    resetSearch() {
      this.searchHistory = []
      this.headerSearchValue = null
      this.headerSearchVisible = false
    },

    resetQueryParams() {
      this.resetSearch()
      const parent = this.$parent
      if (this.defaultQueryParams) {
        const resetParams = JSON.parse(JSON.stringify(this.defaultQueryParams))
        const targetParams = (parent && parent.queryParams) ? parent.queryParams : this.queryParams
        if (targetParams) {
          const pageNum = targetParams.pageNum || 1
          const pageSize = targetParams.pageSize || 15
          Object.keys(targetParams).forEach(key => {
            targetParams[key] = resetParams[key]
          })
          targetParams.pageNum = pageNum
          targetParams.pageSize = pageSize
        }
      }
      this.$nextTick(() => {
        const parentGetList = this.getParentGetList()
        if (parentGetList) {
          parentGetList()
        }
      })
    }
  }
}
</script>

<style scoped>
.header-search-table { width: 100%; }

.header-search-table ::v-deep .cell.header-search-active,
.header-search-table ::v-deep tr.header-search-active > td,
.header-search-table ::v-deep .el-table__header th.header-search-active,
.header-search-table ::v-deep .el-table__header th.header-search-active .cell {
  background-color: #67C23A !important;
  color: #fff !important;
}

.header-search-dialog /deep/ .el-dialog__body { padding: 20px; }
.header-search-box { padding: 0; }
.header-search-title {
  font-weight: bold;
  margin-bottom: 15px;
  color: #409EFF;
  font-size: 14px;
}
</style>
