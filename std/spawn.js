export class Spawn {
	constructor(promise) {
		this.promise = promise;
		// Prevent unhandled rejection warning
		this.promise.catch(() => {});
	}

	onError(handler) {
		this.promise.catch(handler);
		return this;
	}
}
