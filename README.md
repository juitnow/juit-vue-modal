# TypeScript Modals for Vue.js 3

This package contains a package that will mount a Vue component and `await`
for the result value emitted by the `dismissModal` event it triggers.

### Usage

Import the plugin as usual:

```typescript
import { modals } from '@juit/vue-modal'

import App from '../App.vue'

export const app = createSSRApp(App)
    .use(i18n)
```

Then, somewhere in your app use the `<modal-stack />` component (automatically
registered) where you want your _modals_ to be mounted.

The `<modal-stack />` component emits a few events, all with a single parameter
indicating whether modals are currently active or not:

* `modalCreated`: emitted every time a modal is created.
* `modalDismissed`: emitted every time a modal is dismissed.
* `modals`: emitted every time a modal is created or dismissed.

A modal component might look like somewhat like this:

```html
<template>
  <button :onclick="dismiss">DESTROY THIS MODAL</button>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'

  export default defineComponent({
    emits: {
      dismissModal: (result: string) => true,
    },
    methods: {
      dismiss() {
        this.$emit('dismissModal', 'hello, world')
      },
    },
  })
</script>
```

And the code to create, mount, and await for the result of the _modal_
(inside a `defineComponent` stanza) will look like:

```ts
this.$createModal(Modal, { /* ... props for the modal ... */ })
  .then((result) => console.log('MODAL RESULT', result))
```

### License

Licensed under the [Apache License, Version 2.0](LICENSE.md).

[1]: https://www.npmjs.com/package/vite-plugin-vue-svg
[2]: https://www.npmjs.com/package/svgo
