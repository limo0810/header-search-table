import HeaderSearchTable from './src/index.vue'
import SearchReset from './src/SearchReset.vue'
import tableMixin from './src/mixins/tableMixin.js'

export { HeaderSearchTable, SearchReset, tableMixin }

export default {
  install(Vue) {
    Vue.component('HeaderSearchTable', HeaderSearchTable)
    Vue.component('SearchReset', SearchReset)
    Vue.mixin(tableMixin)
  }
}
