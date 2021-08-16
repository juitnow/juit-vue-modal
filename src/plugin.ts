import {
  App,
  ComponentPropsOptions,
  DefineComponent,
  ObjectEmitsOptions,
  Prop,
  VNode,
  defineComponent,
  h,
  reactive,
  warn,
} from 'vue'

/* ========================================================================== *
 * TYPES                                                                      *
 * ========================================================================== */

// Extract the _required_ property keys for a given component: this slightly
// differs from Vue's `RequiredKeys` as we only look for the `required` value
// in the prop definition, and ignore defaults.
type RequiredPropKeys<T> = {
  [K in keyof T]: T[K] extends { required: true } ? K : never
} [keyof T];

// Extract the _optional_ property keys for a given component: this simply
// negates `RequiredPropKeys` above.
type OptionalKeys<T> = Exclude<keyof T, RequiredPropKeys<T>>;

// Infer the type for a property: this is cloned straight from Vue's source,
// as it's not an exported type, dammit!!! :-)
type InferPropType<T> = [T] extends [null] ? any : [T] extends [{
  type: null | true;
}] ? any : [T] extends [ObjectConstructor | {
  type: ObjectConstructor;
}] ? Record<string, any> : [T] extends [BooleanConstructor | {
  type: BooleanConstructor;
}] ? boolean : [T] extends [DateConstructor | {
  type: DateConstructor;
}] ? Date : [T] extends [Prop<infer V, infer D>] ? unknown extends V ? D : V : T;

// All _injectable_ properties (and types) for a component: this differs from
// Vue's `ExtractPropTypes` (and it's simpler) as we simply want a Record of
// required and optional properties that the component needs upon creation.
type InjectablePropTypes<O> = O extends object ? {
  [K in RequiredPropKeys<O>]: InferPropType<O[K]>;
} & {
  [K in OptionalKeys<O>]?: InferPropType<O[K]>;
} : {
  [K in string]: any;
};

// A simple definition for the validation function of Vue's `emit`
type EmitValidator<T> = (arg: T, ...args: any[]) => boolean
// A validation function with no parameters (returning `void`)
type EmitValidatorVoid = () => boolean

// The type of the _first_ parameter of the `dismissModal` emitter in a
// component or `unknown`, to properly return the typed value to our callers
type DismissModalType<E> =
  E extends ObjectEmitsOptions ?
    E['dismissModal'] extends EmitValidatorVoid ? void :
    E['dismissModal'] extends EmitValidator<infer T> ? T :
    unknown :
  unknown

/* ========================================================================== *
 * COMPONENTS                                                                 *
 * ========================================================================== */

// An internal type associating modal component, props, resolution function and
// (if mounted) a vnode
type ModalEntry = {
  component: DefineComponent<any, any, any, any, any, any, any, any, any, any, any, any>,
  props: Record<string, any> | undefined,
  resolve: (result: any) => void,
  vnode?: VNode | undefined,
}

// The ordered stack of all active modal IDs
const stack = reactive([] as string[])

// A record of modal entries keyed by their IDs. This is necessary so that only
// the `stack` array above is _reactive_ while all the details associated with
// their life cycle is now!
const entries: Record<string, ModalEntry> = {}

// Flag for warning users when the modal stack compnent is mounted several times
let mounted = false

// Our modal stack component, rendering one after another all open modals
const ModalStack = defineComponent({
  // Mounted here simply warns the about using <modal-stack/> multiple times
  mounted() {
    if (mounted === true) warn('Vue modal stack component mounted multiple times')
    mounted = true
  },
  // Render our stack of modals, one after another
  render() {
    return stack.map((id) => {
      const entry = entries[id]

      // If we created a vnode before, simply return it
      if (entry.vnode) return entry.vnode

      // Dismiss the modal, removing it from the stack, removing it from our
      // keyed hash of modals, and finally resolving the promise with the result
      function onDismissModal(result: any): void {
        const index = stack.indexOf(id)
        if (index >= 0) stack.splice(index, 1)
        delete entries[id]
        entry.resolve(result)
      }

      // Render our component in the VNODE tree tracking `dismissModal` events
      const component = h(entry.component, {
        ...entry.props,
        onDismissModal,
      })

      // Nicely wrap our modal component in a DIV: one modal, one DIV
      return entry.vnode = h('div', { key: id, [`data-modal-${id}`]: '' }, component)
    })
  },
})

/* ========================================================================== *
 * CREATE MODAL                                                               *
 * ========================================================================== */

// Push a new modal in our modals stack
function createModal<P extends ComponentPropsOptions, E extends ObjectEmitsOptions>(
    component: DefineComponent<P, any, any, any, any, any, any, E, any>,
    props?: InjectablePropTypes<P>,
): Promise<DismissModalType<E>> {
  return new Promise((resolve) => {
    // Get a random ID we can use to identify our DIVs
    const id = Math.floor((Math.random() * Number.MAX_SAFE_INTEGER))
        .toString(16).substr(0, 8).padStart(8, '0')

    // Push our ID, component, props and deferring methods in the stack
    entries[id] = { component, props, resolve }
    stack.push(id)
  })
}

/* ========================================================================== *
 * PLUGIN                                                                     *
 * ========================================================================== */

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    /**
     * Create a modal from the given `component` instantiated with the specifed
     * `props`, and await for it's dismissal returning the result to the caller.
     *
     * @param component The Vue component to be used for the modal call.
     * @param props The (optional) properties to instantiate the component.
     * @returns The value emitted by the `dismissModal` event.
     */
    $createModal: typeof createModal
  }
}

/**
 * The `vue-modals` plugin, instrumenting the `$createModal()` function on
 * components instances and providing the `<modal-stack/>` component.
 */
export const modals = {
  install(app: App): void {
    app.config.globalProperties.$createModal = createModal
    app.component('ModalStack', ModalStack)
  },
}
