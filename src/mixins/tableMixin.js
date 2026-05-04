/**
 * HeaderSearchTable 通用 Mixin
 * 提取嵌套属性处理、字典查询等通用方法
 */
export default {
  data() {
    return {
      // 常见时间字段映射
      timeFieldMappings: {
        endtime: ['startTime', 'endTime'],
        createtime: ['startCreateTime', 'endCreateTime'],
        updatetime: ['startUpdateTime', 'endUpdateTime'],
        starttime: ['startTime', 'endTime'],
        begintime: ['startTime', 'endTime'],
        addtime: ['startTime', 'endTime'],
        modifytime: ['startTime', 'endTime']
      },
      // 分页参数白名单
      pageParams: ['pageNum', 'pageSize', 'orderByColumn', 'isAsc']
    }
  },

  methods: {
    // ==================== 嵌套属性处理 ====================

    /**
     * 判断属性是否为嵌套属性
     * @param {String} property - 属性名
     * @return {Boolean} 是否为嵌套属性
     */
    isNestedProperty(property) {
      return property && property.includes(this.nestedSeparator || '.')
    },

    /**
     * 获取嵌套属性的值
     * @param {Object} obj - 源对象
     * @param {String} property - 属性名，支持嵌套如 user.name
     * @return {any} 属性值
     */
    getNestedValue(obj, property) {
      if (!obj || !property) return undefined

      if (!this.isNestedProperty(property)) {
        return obj[property]
      }

      const keys = property.split(this.nestedSeparator || '.')
      let value = obj
      for (const key of keys) {
        if (value === null || value === undefined) return undefined
        value = value[key]
      }
      return value
    },

    /**
     * 设置嵌套属性的值
     * @param {Object} obj - 源对象
     * @param {String} property - 属性名
     * @param {any} value - 要设置的值
     */
    setNestedValue(obj, property, value) {
      if (!obj || !property) return

      if (!this.isNestedProperty(property)) {
        obj[property] = value
        return
      }

      const keys = property.split(this.nestedSeparator || '.')
      let current = obj
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i]
        if (current[key] === null || current[key] === undefined) {
          current[key] = {}
        }
        current = current[key]
      }
      current[keys[keys.length - 1]] = value
    },

    // ==================== 字典相关 ====================

    /**
     * 获取父组件的字典数据
     * @return {Object|null} 字典数据对象
     */
    getParentDictData() {
      // 从直接父组件查找
      if (this.$parent && this.$parent.dict && this.$parent.dict.type) {
        return this.$parent.dict.type
      }

      // 向上查找
      let parent = this.$parent
      let count = 0
      while (parent && count < 15) {
        if (parent.dict && parent.dict.type) return parent.dict.type
        if (parent.queryParams && parent.$children) {
          for (let i = 0; i < parent.$children.length; i++) {
            const child = parent.$children[i]
            if (child.dict && child.dict.type) return child.dict.type
          }
        }
        parent = parent.$parent
        count++
      }
      return null
    },

    /**
     * 获取父组件声明的 dicts 数组
     * RuoYi 框架中 dicts 在 $options.dicts 中声明
     * @return {Array|null} dicts 数组
     */
    getParentDicts() {
      // 从直接父组件查找 ($options.dicts)
      if (this.$parent && this.$parent.$options && this.$parent.$options.dicts) {
        return this.$parent.$options.dicts
      }

      // 向上查找
      let parent = this.$parent
      let count = 0
      while (parent && count < 15) {
        if (parent.$options && parent.$options.dicts && Array.isArray(parent.$options.dicts)) {
          return parent.$options.dicts
        }
        parent = parent.$parent
        count++
      }
      return null
    },

    /**
     * 在字典数据中查找匹配的key
     * @param {String} property - 字段名
     * @return {String|null} 字典key
     */
    findDictKeyInParent(property) {
      if (this.headerSearchConfig && this.headerSearchConfig[property]) {
        const config = this.headerSearchConfig[property]
        if (typeof config === 'string') {
          return config
        }
        if (typeof config === 'object' && config.dict) {
          return config.dict
        }
      }

      const parentDictData = this.getParentDictData()
      if (parentDictData && parentDictData[property]) return property

      const globalDictData = this.$dict ? this.$dict.data : null
      if (globalDictData && globalDictData[property]) return property

      return null
    },

    /**
     * 加载字典选项
     * @param {String} dictKey - 字典key
     * @param {Function} callback - 回调函数，接收选项数组
     */
    loadDictOptions(dictKey, callback) {
      if (!dictKey) {
        callback([])
        return
      }

      // 1. 优先从 localDict prop 获取
      if (this.localDict && this.localDict[dictKey]) {
        callback(this.localDict[dictKey])
        return
      }

      // 2. 从父组件字典获取
      const parentDictData = this.getParentDictData()
      if (parentDictData && parentDictData[dictKey]) {
        callback(parentDictData[dictKey])
        return
      }

      // 3. 从全局字典获取
      const globalDictData = this.$dict ? this.$dict.data : null
      if (globalDictData && globalDictData[dictKey]) {
        callback(globalDictData[dictKey])
        return
      }

      // 4. 异步获取
      if (this.getDicts) {
        this.getDicts(dictKey).then(function(res) {
          callback(res.data || [])
        }).catch(function() {
          callback([])
        })
      } else {
        callback([])
      }
    },

    // ==================== 时间参数处理 ====================

    /**
     * 获取时间字段对应的开始/结束参数名
     * @param {String} property - 字段名
     * @return {Object} { startParam, endParam }
     */
    getTimeRangeParams(property) {
      const lower = property.toLowerCase()
      for (const key in this.timeFieldMappings) {
        if (lower.includes(key)) {
          const arr = this.timeFieldMappings[key]
          return { startParam: arr[0], endParam: arr[1] }
        }
      }
      // 默认：start + 字段名 / end + 字段名
      const upper = property.charAt(0).toUpperCase() + property.slice(1)
      return { startParam: 'start' + upper, endParam: 'end' + upper }
    },

    // ==================== 通用工具方法 ====================

    /**
     * 检查是否有有效的搜索值
     * @param {String} fieldType - 字段类型
     * @param {any} value - 搜索值
     * @return {Boolean} 是否有有效值
     */
    checkHasValidValue(fieldType, value) {
      if (value === null || value === undefined || value === '') return false
      if (fieldType === 'daterange' || fieldType === 'datetimerange') {
        return Array.isArray(value) && value.length === 2 && value[0] && value[1]
      }
      return true
    },

    /**
     * 检查组件是否有 queryParams 属性
     * @param {Object} vm - Vue 组件实例
     * @return {Boolean} 是否有 queryParams
     */
    hasQueryParams(vm) {
      return vm && vm.queryParams !== undefined && typeof vm.queryParams === 'object'
    },

    /**
     * 获取父组件的 getList 方法
     * @return {Function|null} getList 方法
     */
    getParentGetList() {
      if (this.$parent && typeof this.$parent.getList === 'function') {
        return this.$parent.getList.bind(this.$parent)
      }
      let parent = this.$parent
      let count = 0
      while (parent && count < 15) {
        if (typeof parent.getList === 'function') return parent.getList.bind(parent)
        parent = parent.$parent
        count++
      }
      return null
    },

    /**
     * 获取父页面组件
     * @return {Object|null} 页面组件实例
     */
    getParentPage() {
      let parent = this.$parent
      if (this.hasQueryParams(parent)) return parent
      let count = 0
      while (parent && count < 15) {
        parent = parent.$parent
        if (this.hasQueryParams(parent)) return parent
        count++
      }
      return null
    }
  }
}
