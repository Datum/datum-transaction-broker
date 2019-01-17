class ExceptionTranslator {

  constructor() {
    this.ERRORS = {
      RPC: { msg: 'invalid json rpc response', v: 0 },
      LOW_NONCE: { msg: 'nonce too low', v: 1 },
      SAME_NONCE: { msg: 'replacement transaction underpriced', v: 2 },
    };
  }

  translate(error) {
    const msg = this.getMsg(error);
    if (typeof msg !== 'undefined') {
      for (const key in this.ERRORS) {
        if (msg.includes(this.ERRORS[key].msg)) {
          return this.ERRORS[key].v;
        }
      }
    }
    return undefined;
  }

  getMsg(error) {
    if (typeof error !== 'undefined') {
      if (typeof error === 'object' && typeof error.message !== 'undefined') {
        return error.message.toLowerCase();
      }
      if (typeof error === 'string') {
        return error.toLowerCase();
      }
    }
    return undefined;
  }

  get errors() {
    return { ...this.ERRORS };
  }

}
const et = new ExceptionTranslator();
module.exports = et;
