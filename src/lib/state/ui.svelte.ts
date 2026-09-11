class UIState {
	searchVisible = $state(false);
	layersModalVisible = $state(false);
	aboutModalVisible = $state(false);
	shareModalVisible = $state(false);

	closeAll() {
		this.searchVisible = false;
		this.layersModalVisible = false;
		this.aboutModalVisible = false;
		this.shareModalVisible = false;
	}

	openSearch() {
		this.closeAll();
		this.searchVisible = true;
	}

	openLayers() {
		this.closeAll();
		this.layersModalVisible = true;
	}

	toggleLayers() {
		if (this.layersModalVisible) this.closeAll();
		else this.openLayers();
	}

	openAbout() {
		this.closeAll();
		this.aboutModalVisible = true;
	}

	toggleAbout() {
		if (this.aboutModalVisible) this.closeAll();
		else this.openAbout();
	}

	openShare() {
		this.closeAll();
		this.shareModalVisible = true;
	}

	toggleShare() {
		if (this.shareModalVisible) this.closeAll();
		else this.openShare();
	}
}

export const ui = new UIState();
