if (! Element.prototype.matches) {
	Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}

const firstChildren = ($parent, selector) => {
	for (const $child of $parent.children) {
		if ($child.matches(selector)) {
			return $child
		}
	}
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const handleAnimation = ($container, content, onSlideMount) =>  new Promise(resolve => {
	const $clip = firstChildren($container, '.RevealAnimation-Clip')

	if (! $clip) {
		throw 'Not Found .RevealAnimation-Clip'
	}

	if (content._ready) {
		delete content._ready
		$container.classList.remove('RevealAnimation_prepared')
	} else {
		$clip.insertAdjacentHTML('afterend', content.html)

		if (onSlideMount) {
			onSlideMount()
		}
	}

	$container.classList.add('RevealAnimation_start')

	return $clip.addEventListener('animationend', e => {
		if (e.target === $clip) {
			$container.classList.remove('RevealAnimation_start')
			$clip.parentNode.removeChild($clip)

			resolve()
		}
	})
})

const waitImageReady = ($container, content, onSlideMount) => new Promise(resolve => {
	$container.classList.add('RevealAnimation_prepared')
	content._ready = true

	const $clip = firstChildren($container, '.RevealAnimation-Clip')

	if (! $clip) {
		throw 'Not Found .RevealAnimation-Clip'
	}

	$clip.insertAdjacentHTML('afterend', content.html)

	if (onSlideMount) {
		onSlideMount()
	}

	const $clip2 = firstChildren($container, '.RevealAnimation-Clip:nth-child(2)')

	if (! $clip2) {
		throw 'Not Found .RevealAnimation-Clip:nth-child(2)'
	}

	const $imgs = $clip2.querySelectorAll('img')

	if (! $imgs.length) {
		return resolve()
	}

	let loaded = 0

	const markReady = () => {
		loaded++;

		if (loaded === $imgs.length) {
			resolve()
		}
	}

	for (const $img of $imgs) {
		if ($img.complete) {
			markReady()
		} else {
			$img.addEventListener('load', () => {
				markReady()
			})
		}
	}

	setTimeout(() => {
		resolve()
	}, 3000)
})

export default
($container, contents, onSlideMount) => {
	let active = 0

	let _willStop = true
	let _realStop = true

	const stop = () => {
		_willStop = true
	}

	const start = () => {
		_willStop = false

		if (_realStop) {
			_realStop = false
			next()
		}
	}

	async function next() {
		const nextActive = (active + 1) % contents.length
		const content = contents[nextActive]

		if (! content.loaded) {
			const startTs = (new Date()).getTime()
			await waitImageReady($container, content, onSlideMount)
			content.loaded = true
			const endTs = (new Date()).getTime()

			const toSleep = endTs - startTs + content.pause

			if (toSleep > 0) {
				await sleep(toSleep)
			}
		} else {
			await sleep(content.pause)
		}

		await handleAnimation($container, content, onSlideMount)

		active = nextActive

		if(_willStop) {
			_realStop = true
			return
		}

		return next()
	}

	if ('IntersectionObserver' in window) {
		const $observer = $container

		const rootConfig = {
			root: null,
			rootMargin: "-20% 0px -20%"
		}

		const intersectionObserver = new IntersectionObserver(entries => {
			const observer = entries[0]

			if (observer.isIntersecting) {
				start()
			} else {
				stop()
			}
		}, rootConfig)

		intersectionObserver.observe($observer)

	} else {
		start()
	}

	return { stop, start }
}