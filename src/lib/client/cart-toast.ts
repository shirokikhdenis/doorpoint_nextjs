export type CartToastListener = (message: string) => void;

const listeners = new Set<CartToastListener>();

export const cartToast = {
  show(message: string) {
    for (const listener of listeners) listener(message);
  },

  subscribe(listener: CartToastListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
