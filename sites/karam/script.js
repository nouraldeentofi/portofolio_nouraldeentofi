document.addEventListener('DOMContentLoaded', () => {
          // Intersection Observer for scroll animations
          const observerOptions = {
                    root: null,
                    rootMargin: '0px',
                    threshold: 0.15
          };

          const observer = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                              if (entry.isIntersecting) {
                                        entry.target.classList.add('visible');
                                        observer.unobserve(entry.target);
                              }
                    });
          }, observerOptions);

          const fadeElements = document.querySelectorAll('.fade-in');
          fadeElements.forEach(el => {
                    observer.observe(el);
          });

          // Typewriter effect
          const typeTarget = document.querySelector('.type-effect');
          const words = ["TechSpark Karam", "Coding Fun", "Cool Gadgets", "Future Tech"];
          let wordIndex = 0;
          let charIndex = 0;
          let isDeleting = false;
          let typingDelay = 150;

          function typeWriter() {
                    const currentWord = words[wordIndex];

                    if (isDeleting) {
                              typeTarget.textContent = currentWord.substring(0, charIndex - 1);
                              charIndex--;
                              typingDelay = 50;
                    } else {
                              typeTarget.textContent = currentWord.substring(0, charIndex + 1);
                              charIndex++;
                              typingDelay = 150;
                    }

                    if (!isDeleting && charIndex === currentWord.length) {
                              isDeleting = true;
                              typingDelay = 1500; // Pause at end
                    } else if (isDeleting && charIndex === 0) {
                              isDeleting = false;
                              wordIndex = (wordIndex + 1) % words.length;
                              typingDelay = 500; // Pause before new word
                    }

                    setTimeout(typeWriter, typingDelay);
          }

          if (typeTarget) {
                    setTimeout(typeWriter, 1000);
          }

          // Falling words background effect
          const techWords = ["HTML", "CSS", "JS", "Apps", "Robots", "Gaming", "Code", "Build", "Tech", "Smart"];
          const backgroundContainer = document.querySelector('.background-animation');

          function createFallingWord() {
                    const wordEl = document.createElement('div');
                    wordEl.classList.add('falling-word');
                    wordEl.textContent = techWords[Math.floor(Math.random() * techWords.length)];

                    // Randomize starting position, size, and falling duration
                    wordEl.style.left = (Math.random() * 90) + 'vw';
                    wordEl.style.fontSize = (Math.random() * 1.5 + 1) + 'rem';
                    wordEl.style.animationDuration = (Math.random() * 10 + 10) + 's'; // 10 to 20 seconds
                    wordEl.style.opacity = Math.random() * 0.3 + 0.1;

                    if (backgroundContainer) {
                              backgroundContainer.appendChild(wordEl);
                    }

                    // Remove element after it falls
                    setTimeout(() => {
                              wordEl.remove();
                    }, 20000);
          }

          // Create a new word every 800ms
          setInterval(createFallingWord, 800);

          // Create some initial words scattered around
          for (let i = 0; i < 8; i++) {
                    setTimeout(createFallingWord, i * 300);
          }
});
