// Browser-fixture shim only. The extension uses the real WXT browser API.
export const browser = {
  runtime: {
    async sendMessage() {
      throw new Error('The fixture must use its local transport.');
    },
  },
};
