import { App, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { exec } from "child_process";
import { promisify } from "util";

interface ObsidianRgSettings {
	rgLocation: string;
	additionalArguments?: string
}

const DEFAULT_SETTINGS: ObsidianRgSettings = {
	rgLocation: '/usr/local/bin/rg'
}

type RgResult = {
	type: "match", 
	data: {
		path: {text: string},
		lines: {text: string},
		line_number: number,
		absolute_offset: number,
		submatches: {
			match: {
				text: string
			},
			start: number,
			end: number
		}[]
	}
}[]

export default class ObsidianRg extends Plugin {
	settings: ObsidianRgSettings;
	exec_promise: Function;

	async onload() {

		this.exec_promise = promisify(exec);

		await this.loadSettings();
		this.addCommand({
			id: 'open-obsidian-rg-modal',
			name: 'Find',
			// callback: () => {
			// 	console.log('Simple Callback');
			// },
			checkCallback: (checking: boolean) => {
				let leaf = this.app.workspace.activeLeaf;
				if (leaf) {
					if (!checking) {
						new ObsidianRgModal(this.app, this).open();
					}
					return true;
				}
				return false;
			}
		});

		this.addSettingTab(new RgSettingsTab(this.app, this));

	}

	onunload() {
		
	}

	async search(query: string): Promise<RgResult> {
		const {stdout} = await this.exec_promise(`${this.settings.rgLocation} "${query}" "${this.app.vault.adapter.basePath}" --json`);
		return stdout.trimRight().split("\n").map(JSON.parse).filter((res: {type: string}) => res.type === "match")
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

function stringSplice(text: string, start: number,length: number,replacement: string): string {
    const asArray = text.split("")
	asArray.splice(start,length,replacement)
	return asArray.join("")
}

function debounce(func: Function, wait: number, immediate: boolean) {
  var timeout: NodeJS.Timeout;
  return function() {
  	var context = this, args = arguments;
  	clearTimeout(timeout);
  	timeout = setTimeout(function() {
  		timeout = null;
  		if (!immediate) func.apply(context, args);
  	}, wait);
  	if (immediate && !timeout) func.apply(context, args);
  };
}



class ObsidianRgModal extends Modal {
	plugin: ObsidianRg;
	constructor(app: App, plugin: ObsidianRg) {
		super(app);
		this.plugin = plugin
	}

	async search(e: KeyboardEvent, parentElem: HTMLElement) {
		const div = document.createElement('div')
		div.addClass("prompt-results")
		try {
			const results = await this.plugin.search((e.target as HTMLInputElement).value)
			if (results.length === 0) {
				const errorMsg = document.createElement("div")
				errorMsg.innerText = "Sorry, no results found"
				div.appendChild(errorMsg)
			}
			this.resultAsHTML(results).forEach((elem) =>div.appendChild(elem))
		} catch (e) {
			const errorMsg = document.createElement("div")
			errorMsg.innerText = "Sorry, no results found"
			div.appendChild(errorMsg)
		}
		const resultContainer = Array.from(parentElem.children).find(elem => elem.classList.contains("prompt-results"))
		if (resultContainer) {
			parentElem.replaceChild(div, resultContainer)
		} else {
			parentElem.appendChild(div)
		}
	}

	resultAsHTML(rgResult: RgResult): HTMLElement[]{
		return rgResult.map(({data})=> {
			const path = data.path.text.replace(this.app.vault.adapter.basePath + "/", "")
			let text = data.lines.text
			data.submatches.forEach(({match}) => {
				text = text.replaceAll(match.text,`<mark>${match.text}</mark>`)
			})
			const open = () => {
				this.app.workspace.openLinkText(path,path)
				this.close()
			}
			const link = document.createElement("div")
			link.addClass("suggestion-item")
			link.onclick = open
			link.addEventListener("mouseenter", () => {link.classList.add("is-selected")})
			link.addEventListener("mouseleave", () => {link.classList.remove("is-selected")})
			link.innerHTML = `<h4>${path}</h4>
			<p>${text}</p>`
			return link
		})
	}

	onOpen() {
		let {contentEl} = this;
		const wrapper = document.createElement("div")
		wrapper.addClass("prompt")
		const input = document.createElement("input")
		input.type = "text"
		input.addClass("prompt-input")
		input.placeholder = "journal"
		input.onkeydown = debounce((e: KeyboardEvent) =>this.search(e, contentEl), 300, false)
		contentEl.appendChild(input)
		input.focus()
	}

	onClose() {
		let {contentEl} = this;
		contentEl.empty();
	}
}

class RgSettingsTab extends PluginSettingTab {
	plugin: ObsidianRg;

	constructor(app: App, plugin: ObsidianRg) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('ripgrep location')
			.setDesc("Execute which rg in your shell to see where it's located")
			.addText(text => text
				.setPlaceholder('/usr/local/bin/rg')
				.setValue('/usr/local/bin/rg')
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.rgLocation = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('ripgrep arguments')
			.setDesc("additional arguments to send ripgrep")
			.addText(text => text
				.setPlaceholder('--hidden')
				.setValue('')
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.additionalArguments = value;
					await this.plugin.saveSettings();
				}));
	}
}
