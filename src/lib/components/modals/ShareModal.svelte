<script lang="ts">
	import { page } from "$app/state";
	import { Check, ClipboardText, EnvelopeSimple, LinkedinLogo, RedditLogo, WhatsappLogo } from "phosphor-svelte";

	import Modal from "$lib/components/ui/Modal.svelte";

	let { visible = $bindable() } = $props();

	let copySuccess = $state(false);

	let currentUrl = $derived(page.url.href);

	async function copyToClipboard() {
		try {
			if (navigator.clipboard && window.isSecureContext) {
				await navigator.clipboard.writeText(currentUrl);
			} else {
				const textArea = document.createElement("textarea");
				textArea.value = currentUrl;
				document.body.appendChild(textArea);
				textArea.select();
				document.execCommand("copy");
				document.body.removeChild(textArea);
			}
			copySuccess = true;
		} catch (err) {
			console.error("Kopiëren mislukt:", err);
		}
	}

	$effect(() => {
		if (copySuccess) {
			const timeout = setTimeout(() => {
				copySuccess = false;
			}, 1500);
			return () => clearTimeout(timeout);
		}
	});

	let mailtoUrl = $derived(
		`mailto:?subject=${encodeURIComponent("Bekijk Watertijdreis en reis terug in de tijd")}&body=${encodeURIComponent(
			`Ik wil je uitnodigen om de Watertijdreis te bekijken. Klik op deze link om te beginnen:\n\n${currentUrl}`
		)}`
	);

	let linkedinUrl = $derived(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`);

	let redditUrl = $derived(
		`https://reddit.com/submit?url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent(
			"Watertijdreis - Reis door de tijd!"
		)}`
	);

	let whatsappUrl = $derived(
		`https://wa.me/?text=${encodeURIComponent(
			`Watertijdreis - Reis door de tijd!\nKlik op de link om door de tijd te reizen!\n${currentUrl}`
		)}`
	);
</script>

<Modal title="Deel jouw Watertijdreis" bind:visible>
	<p class="w-full text-center">Deel het kaartgedeelte dat jij nu bekijkt.</p>

	<div class="mt-4 flex items-center justify-between gap-3">
		<input
			type="text"
			readonly
			value={currentUrl}
			class="border-wtr-subtle-blue text-wtr-blue bg-wtr-pink/10 h-12 flex-1 rounded-md border-2 px-3 py-1 text-base font-medium outline-none"
		/>
		<button
			type="button"
			onclick={copyToClipboard}
			class="bg-wtr-blue hover:bg-wtr-blue/90 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md px-4 font-semibold text-white transition-colors"
		>
			{#if copySuccess}
				<Check size={20} color="#fff" />
				<span>Gekopieerd</span>
			{:else}
				<ClipboardText size={20} color="#fff" />
				<span>Kopieer</span>
			{/if}
		</button>
	</div>

	<div class="mt-8 flex items-center justify-center gap-8">
		<a href={mailtoUrl} aria-label="Deel via E-mail" class="transition-transform hover:scale-110">
			<EnvelopeSimple size={30} color="var(--color-wtr-pink)" />
		</a>
		<a
			href={linkedinUrl}
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Deel op LinkedIn"
			class="transition-transform hover:scale-110"
		>
			<LinkedinLogo size={30} color="var(--color-wtr-pink)" />
		</a>
		<a
			href={redditUrl}
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Deel op Reddit"
			class="transition-transform hover:scale-110"
		>
			<RedditLogo size={30} color="var(--color-wtr-pink)" />
		</a>
		<a
			href={whatsappUrl}
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Deel via WhatsApp"
			class="transition-transform hover:scale-110"
		>
			<WhatsappLogo size={30} color="var(--color-wtr-pink)" />
		</a>
	</div>
</Modal>
