
const duration = 1000

const createObserver = ($observer, rootConfig, scrollAnimationObserver, fallback) => {

	let intersectionObserver

	if (scrollAnimationObserver) {
		intersectionObserver = new IntersectionObserver(entries => {
			const observer = entries.find(entry => entry.target === $observer)

			if (observer) {
				if (observer.isIntersecting) {
					scrollAnimationObserver.start(observer, $observer)
				} else {
					scrollAnimationObserver.stop(observer, $observer)
				}
			} else {
				scrollAnimationObserver.stop(entries[0], $observer)
			}

		}, rootConfig)
	} else if (fallback) {
		intersectionObserver = new IntersectionObserver(entries => {
			if (window.pageYOffset >= $observer.offsetTop) {
				fallback.$el.classList.remove(fallback.classBackward)
				fallback.$el.classList.add(fallback.classForward)
			} else {
				fallback.$el.classList.remove(fallback.classForward)
				fallback.$el.classList.add(fallback.classBackward)
			}
		}, fallback.rootConfig || rootConfig)
	}

	return intersectionObserver
}

const toPositionsBoundaries = (entry, $observer) => {
	const elPosition = {}
	const scrollPositionBoundaries = {}

	elPosition.boundingClientRect = entry.boundingClientRect
	elPosition.rootBounds = entry.rootBounds
	elPosition.offsetTop = $observer.offsetTop

	scrollPositionBoundaries.min = elPosition.offsetTop - elPosition.rootBounds.height - elPosition.rootBounds.top
	scrollPositionBoundaries.max = elPosition.offsetTop + elPosition.boundingClientRect.height - elPosition.rootBounds.top
	scrollPositionBoundaries.height = elPosition.rootBounds.height + elPosition.boundingClientRect.height

	return scrollPositionBoundaries
}

const initAnimations = (animationConfigs) => {
	const animations = []

	const initAnimation = ($el, config) => {
		if (! ('animate' in $el)) {
			return
		}
		const animation = $el.animate(config.keyframes, Object.assign({}, { fill: 'both' }, config.options, { duration } ))
		animation.pause()
		animations.push(animation)
	}

	for (let i = 0; i < animationConfigs.length; i++) {
		const config = animationConfigs[ i ]

		if (config.$el instanceof NodeList) {
			for (let j = 0; j < config.$el.length; j++) {
				const $el = config.$el[ j ]

				initAnimation($el, config)
			}
		} else {
			initAnimation(config.$el, config)
		}
	}

	return animations
}

class ScrollAnimationObserver {
	constructor(animationConfigs) {
		this._scrollPositionBoundaries = undefined

		this.animationConfigs = animationConfigs
		this._animations = initAnimations(animationConfigs)
		this._started = false

		this._onScroll = this._getOnScroll()
	}

	start(intersection, $observer) {
		if (this._started) {
			return
		}
		this._started = true

		if (! this._animations) {
			this.initAnimations()
		}

		this._scrollPositionBoundaries = toPositionsBoundaries(intersection, $observer)

		this._handleScroll(window.pageYOffset)

		window.addEventListener('scroll', this._onScroll, { passive: true })
	}

	stop(intersection, $observer) {
		if (! this._started) {

			if (! this._scrollPositionBoundaries) {
				this._scrollPositionBoundaries = toPositionsBoundaries(intersection, $observer)
			}

			this._handleScroll(window.pageYOffset)

			return
		}
		this._started = false

		window.removeEventListener('scroll', this._onScroll)
	}

	_handleScroll(scrollPos) {
		let animPosition = ((scrollPos - this._scrollPositionBoundaries.min) / this._scrollPositionBoundaries.height) * duration

		if (animPosition < 0) {
			animPosition = 0
		} else if (animPosition >= duration) {
			animPosition = duration - 1
		}

		for (let i = 0; i < this._animations.length; i++) {
			this._animations[ i ].currentTime = animPosition
		}
	}

	_getOnScroll() {
		let lastKnownScrollPosition = 0
		let ticking = false

		return e => {
			lastKnownScrollPosition = window.scrollY

			if (! ticking) {
				window.requestAnimationFrame(() => {
					this._handleScroll(lastKnownScrollPosition)
					ticking = false
				})

				ticking = true
			}
		}
	}
}

export default
function animate($observer, rootConfig, animationConfigs, fallback = undefined, $catchers = undefined) {
	if (! ('IntersectionObserver' in window)) {
		return
	}

	if (! ('animate' in Element.prototype) && ! fallback) {
		return
	}

	let scrollAnimationObserver

	if ('animate' in Element.prototype) {
		scrollAnimationObserver = new ScrollAnimationObserver(animationConfigs)
	}

	const intersectionObserver = createObserver($observer, rootConfig, scrollAnimationObserver, fallback)

	intersectionObserver.observe($observer)

	if ($catchers) {
		$catchers.forEach($catcher => intersectionObserver.observe($catcher))
	}
}