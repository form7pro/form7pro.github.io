
const duration = 1000

const createObserver = ($observer, rootConfig, scrollAnimationObserver) => {

	const intersectionObserver = new IntersectionObserver(entries => {
		const observer = entries.find(entry => entry.target === $observer)

		if (observer) {
			if (observer.isIntersecting) {
				scrollAnimationObserver.start(observer)
			} else {
				scrollAnimationObserver.stop(observer)
			}
		} else {
			scrollAnimationObserver.stop(observer)
		}

	}, rootConfig)

	return intersectionObserver
}

const toPositionsBoundaries = entry => {
	const elPosition = {}
	const scrollPositionBoundaries = {}

	elPosition.boundingClientRect = entry.boundingClientRect
	elPosition.rootBounds = entry.rootBounds
	elPosition.offsetTop = entry.target.offsetTop

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
		const animation = $el.animate(config.keyframes, { ...{ fill: 'both' }, ...config.options, duration })
		animation.pause()
		animations.push(animation)
	}

	for (const config of animationConfigs) {
		if (config.$el instanceof NodeList) {
			for (const $el of config.$el) {
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

	start(intersection) {
		if (this._started) {
			return
		}
		this._started = true

		if (! this._animations) {
			this.initAnimations()
		}

		this._scrollPositionBoundaries = toPositionsBoundaries(intersection)

		this._handleScroll(window.pageYOffset)

		window.addEventListener('scroll', this._onScroll, { passive: true })
	}

	stop(intersection) {
		if (! this._started) {

			if (! this._scrollPositionBoundaries) {
				this._scrollPositionBoundaries = toPositionsBoundaries(intersection)
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
function animate($observer, rootConfig, animationConfigs, $catchers = undefined) {
	if (! ('IntersectionObserver' in window)) {
		return
	}

	const scrollAnimationObserver = new ScrollAnimationObserver(animationConfigs)

	const intersectionObserver = createObserver($observer, rootConfig, scrollAnimationObserver)

	intersectionObserver.observe($observer)

	if ($catchers) {
		$catchers.forEach($catcher => intersectionObserver.observe($catcher))
	}
}