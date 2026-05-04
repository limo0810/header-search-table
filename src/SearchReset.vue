<template>
  <el-button icon="el-icon-refresh" size="mini" @click="handleReset">重置</el-button>
</template>

<script>
import tableMixin from './mixins/tableMixin'

/**
 * SearchReset 组件
 * 搜索重置按钮组件
 * 使用方式：<SearchReset />
 */
export default {
  name: 'SearchReset',

  mixins: [tableMixin],

  methods: {
    /**
     * 获取 HeaderSearchTable 组件引用
     * @return {Object|null} HeaderSearchTable 组件实例
     */
    getHeaderSearchTable() {
      // 1. 检查当前父组件（弹窗场景）
      const currentParent = this.$parent
      if (currentParent) {
        // 检查 $refs
        if (currentParent.$refs) {
          for (const key in currentParent.$refs) {
            const ref = currentParent.$refs[key]
            if (ref && ref.resetSearch) return ref
          }
        }
        // 检查 $children
        if (currentParent.$children) {
          for (let i = 0; i < currentParent.$children.length; i++) {
            const child = currentParent.$children[i]
            if (child.$options && child.$options.name === 'HeaderSearchTable' && child.resetSearch) {
              return child
            }
          }
        }
      }

      // 2. 获取父页面组件
      const parent = this.getParentPage()
      if (!parent) return null

      // 3. 常见 ref 名称
      const commonRefs = ['headerSearchTable', 'manufacturingTaskTable', 'table', 'multipleTable']
      for (let i = 0; i < commonRefs.length; i++) {
        const refName = commonRefs[i]
        if (parent.$refs[refName] && parent.$refs[refName].resetSearch) return parent.$refs[refName]
      }

      // 4. 遍历所有 ref
      if (parent.$refs) {
        for (const key in parent.$refs) {
          const ref = parent.$refs[key]
          if (ref && ref.resetSearch) return ref
        }
      }

      // 5. 遍历 $children
      if (parent.$children) {
        for (let i = 0; i < parent.$children.length; i++) {
          const child = parent.$children[i]
          if (child.$options && child.$options.name === 'HeaderSearchTable' && child.resetSearch) {
            return child
          }
        }
      }

      return null
    },

    /**
     * 重置搜索条件
     */
    handleReset() {
      const headerSearchTable = this.getHeaderSearchTable()

      // 优先调用 resetQueryParams（完全重置）
      if (headerSearchTable && headerSearchTable.resetQueryParams) {
        headerSearchTable.resetQueryParams()
        return
      }

      // 兼容旧版：只清空表头搜索
      if (headerSearchTable && headerSearchTable.resetSearch) {
        headerSearchTable.resetSearch()
      }

      // 重置父页面查询参数
      const parent = this.getParentPage()
      if (!parent) {
        console.warn('SearchReset: 未找到页面组件')
        return
      }

      // 优先调用页面已有方法
      if (parent.resetQuery) {
        parent.resetQuery()
        return
      }

      const queryParams = parent.queryParams
      if (!queryParams) {
        console.warn('SearchReset: 未找到 queryParams')
        return
      }

      // 使用 defaultQueryParams 重置
      if (parent.defaultQueryParams) {
        parent.queryParams = JSON.parse(JSON.stringify(parent.defaultQueryParams))
        parent.queryParams.pageNum = 1
      } else {
        // 手动清空（保留分页参数）
        Object.keys(queryParams).forEach(key => {
          if (this.pageParams.indexOf(key) === -1) {
            queryParams[key] = null
          }
        })
        queryParams.pageNum = 1
      }

      // 刷新列表
      if (parent.getList) {
        parent.getList()
      }
    }
  }
}
</script>
