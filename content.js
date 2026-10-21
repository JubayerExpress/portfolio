/* Site content. Managed by admin.html (the admin panel), or edit by hand.
   Keep everything after 'window.SITE =' valid JSON. */
window.SITE = {
  "name": "Jubayer",
  "fullName": "G M Jubayer Zaman",
  "siteTitle": "Jubayer — CSE Student, Writer & Space Dreamer",
  "roles": [
    "CSE Undergrad",
    "Robotics Enthusiast",
    "Tech Wizard",
    "Writer"
  ],
  "intro": "CSE undergrad, robotics enthusiast and tech wizard who also loves literature. I build with AI and code, chase big ideas about space and stories, and write about them here.",
  "email": "jubayergmjz1@gmail.com",
  "heroImage": "assets/uploads/1792610584845-jubayer-hd.jpg",
  "ticker": [
    "Code",
    "Robotics",
    "Space",
    "Literature",
    "Research",
    "Writing",
    "AI",
    "NLP",
    "Machine Learning",
    "Reviews",
    "Dreaming big"
  ],
  "socials": [
    {
      "label": "GitHub",
      "url": "https://github.com/JubayerExpress"
    },
    {
      "label": "YouTube",
      "url": "https://www.youtube.com/@jubayersmultiverse"
    },
    {
      "label": "LinkedIn",
      "url": "https://www.linkedin.com/in/gmjz"
    },
    {
      "label": "Facebook",
      "url": "https://facebook.com/"
    }
  ],
  "about": {
    "photo": "assets/me.jpg",
    "paragraphs": [
      "I'm a disciplined, curious CSE student at BRAC University with a strong passion for technology, robotics and artificial intelligence. I love the space where logic meets language, and I write literature on the side.",
      "Right now I'm building an autonomous project and doing research on dialect-independent natural language processing. I believe AI should solve practical problems, so I keep learning, experimenting and teaching what I learn. This site connects my books, research, courses and blog."
    ],
    "facts": [
      {
        "label": "Studying",
        "value": "CSE at BRAC University"
      },
      {
        "label": "Researching",
        "value": "Dialect-independent NLP"
      },
      {
        "label": "Passionate about",
        "value": "Robotics, AI & space"
      },
      {
        "label": "Also",
        "value": "Writing & teaching"
      }
    ],
    "skills": [
      "Python",
      "C",
      "C++",
      "JavaScript",
      "Java",
      "NLP",
      "Machine Learning",
      "Arduino",
      "OpenCV",
      "TensorFlow",
      "Django",
      "Firebase",
      "Blender",
      "Figma",
      "Git",
      "Public Speaking",
      "Leadership"
    ]
  },
  "books": [
    {
      "title": "Your First Book Title",
      "year": "2026",
      "blurb": "A short description of the book: what it is about and who it is for.",
      "tags": [
        "Literature",
        "Poetry"
      ],
      "link": "#",
      "linkText": "Read more",
      "image": ""
    },
    {
      "title": "Another Book or Collection",
      "year": "2025",
      "blurb": "Replace this with your own writing. Short stories, essays, poems, anything you publish.",
      "tags": [
        "Fiction"
      ],
      "link": "#",
      "linkText": "Read more",
      "image": ""
    },
    {
      "title": "Work in Progress",
      "year": "Coming soon",
      "blurb": "Tease the next project here. Readers love knowing what is coming.",
      "tags": [
        "Essays"
      ],
      "link": "#",
      "linkText": "Follow progress",
      "image": ""
    }
  ],
  "research": [
    {
      "title": "SoccerBot",
      "venue": "Robotics project",
      "year": "2025",
      "summary": "A C++ project for building a soccer-playing robot. Edit this to describe the hardware, the control logic and what you learned.",
      "tags": [
        "Robotics",
        "C++",
        "Embedded"
      ],
      "link": "https://github.com/JubayerExpress/SoccerBot-HQ",
      "linkText": "View on GitHub",
      "image": ""
    },
    {
      "title": "Dialect-Independent Natural Language Processing",
      "venue": "Ongoing research",
      "year": "2026",
      "summary": "Building NLP systems that understand a language across its dialects, not just its standard form. Add your method, dataset and results here as the work progresses.",
      "tags": [
        "NLP",
        "AI",
        "Machine Learning"
      ],
      "link": "#",
      "linkText": "Learn more",
      "image": ""
    }
  ],
  "courses": [
    {
      "title": "C Basics for Beginners",
      "platform": "GitHub",
      "level": "Beginner",
      "description": "A beginner-friendly walkthrough of the C programming language with examples you can run.",
      "link": "https://github.com/JubayerExpress/C-Basics-for-Beginners",
      "linkText": "Open course",
      "image": ""
    },
    {
      "title": "JavaScript Basics for Beginners",
      "platform": "GitHub",
      "level": "Beginner",
      "description": "Start JavaScript from zero: variables, functions, the DOM and small projects.",
      "link": "https://github.com/JubayerExpress/JavaScript-Basics-for-Beginners",
      "linkText": "Open course",
      "image": ""
    },
    {
      "title": "Your Lecture Website",
      "platform": "Your own site",
      "level": "Any level",
      "description": "Point this card at one of your separate lecture websites.",
      "link": "https://example.com",
      "linkText": "Open course site",
      "image": ""
    }
  ],
  "blog": {
    "categories": [
      "Education",
      "Book Reviews",
      "Movie Reviews",
      "Game Reviews",
      "Thoughts"
    ]
  },
  "posts": [
    {
      "id": "binary-search-explained",
      "title": "Binary Search, Explained Like You're Guessing a Number",
      "category": "Education",
      "date": "2026-10-18",
      "rating": "",
      "subject": "",
      "excerpt": "The fastest way to find something in sorted data, in plain language, with C code and the bugs to avoid.",
      "cover": "",
      "tags": [
        "Algorithms",
        "C"
      ],
      "draft": false,
      "body": "Binary search is the classic \"I'm thinking of a number between 1 and 100\" trick, turned into an algorithm.\n\n## The idea\n\nInstead of checking every number one by one, you **always guess the middle**. If the guess is too high, throw away the upper half. If it's too low, throw away the lower half. Each guess halves the problem.\n\n> 1,000,000 items? At most **20 guesses**. That's the power of `O(log n)`.\n\n## The code\n\n```c\nint binary_search(int a[], int n, int target) {\n    int lo = 0, hi = n - 1;\n    while (lo <= hi) {\n        int mid = lo + (hi - lo) / 2;   // avoids overflow\n        if (a[mid] == target) return mid;\n        if (a[mid] < target) lo = mid + 1;\n        else hi = mid - 1;\n    }\n    return -1;\n}\n```\n\n## Things people get wrong\n\n- The array **must be sorted** first.\n- Use `lo + (hi - lo) / 2`, not `(lo + hi) / 2`, to avoid integer overflow.\n- Off-by-one errors live in the `lo`/`hi` updates. Trace a tiny example by hand.\n\nThat's it. Simple idea, surprisingly easy to get wrong, and worth mastering."
    },
    {
      "id": "sample-book-review",
      "title": "Sample Book Review: Replace Me",
      "category": "Book Reviews",
      "date": "2026-10-15",
      "rating": 4,
      "subject": "Book title by Author",
      "excerpt": "A sample book review showing how ratings and subjects appear. Edit or delete it in the admin panel.",
      "cover": "",
      "tags": [
        "Sample"
      ],
      "draft": false,
      "body": "This is a **sample review**. Open the admin panel, delete or edit it, and write your own.\n\n## What I liked\n\n- Point one\n- Point two\n\n## What I didn't\n\nBe honest. Readers trust honest reviews.\n\n## Verdict\n\nOne or two sentences that sum it all up."
    },
    {
      "id": "sample-movie-review",
      "title": "Sample Movie Review: Replace Me",
      "category": "Movie Reviews",
      "date": "2026-10-12",
      "rating": 5,
      "subject": "Movie title (Year)",
      "excerpt": "A sample movie review. Add a cover image and your own verdict.",
      "cover": "",
      "tags": [
        "Sample"
      ],
      "draft": false,
      "body": "This is a **sample review**. Open the admin panel, delete or edit it, and write your own.\n\n## What I liked\n\n- Point one\n- Point two\n\n## What I didn't\n\nBe honest. Readers trust honest reviews.\n\n## Verdict\n\nOne or two sentences that sum it all up."
    },
    {
      "id": "sample-game-review",
      "title": "Sample Game Review: Replace Me",
      "category": "Game Reviews",
      "date": "2026-10-10",
      "rating": 3,
      "subject": "Game title",
      "excerpt": "A sample game review. Rate gameplay, story and vibes however you like.",
      "cover": "",
      "tags": [
        "Sample"
      ],
      "draft": false,
      "body": "This is a **sample review**. Open the admin panel, delete or edit it, and write your own.\n\n## What I liked\n\n- Point one\n- Point two\n\n## What I didn't\n\nBe honest. Readers trust honest reviews.\n\n## Verdict\n\nOne or two sentences that sum it all up."
    }
  ],
  "education": {
    "intro": "Where I study, what I have achieved so far, and the communities I am proud to be part of.",
    "schooling": [
      {
        "title": "B.Sc. in Computer Science and Engineering",
        "institution": "BRAC University",
        "year": "Now",
        "note": "Focusing on AI, NLP and robotics.",
        "status": "Currently pursuing"
      },
      {
        "title": "Higher Secondary Certificate (HSC)",
        "institution": "Rajuk Uttara Model College",
        "year": "2021",
        "note": "Scored 600 out of 600 marks in Physics, Chemistry and Higher Mathematics.",
        "status": "Board scholarship"
      },
      {
        "title": "Secondary School Certificate (SSC)",
        "institution": "Rajuk Uttara Model College",
        "year": "2019",
        "note": "Completed with distinction.",
        "status": "Board scholarship"
      }
    ],
    "highlights": [
      {
        "n": "600/600",
        "l": "HSC marks in Physics, Chemistry and Higher Math"
      },
      {
        "n": "2×",
        "l": "Board scholarships (SSC and HSC)"
      },
      {
        "n": "18th",
        "l": "Bangladesh Physics Olympiad, college category"
      },
      {
        "n": "Best",
        "l": "Campus Ambassador, Technocrats V.2 (2024)"
      }
    ],
    "achievements": [
      {
        "icon": "🧭",
        "title": "General Secretary",
        "org": "BRAC University Computer Club (BUCC)",
        "year": "2026"
      },
      {
        "icon": "🤖",
        "title": "Machine Learning Instructor",
        "org": "Residential Campus, BRAC University",
        "year": "2026"
      },
      {
        "icon": "🔬",
        "title": "Former Director, Research and Project Management",
        "org": "Robotics Club of BRAC University (ROBU)",
        "year": "2025"
      },
      {
        "icon": "📣",
        "title": "bdapps Campus Ambassador",
        "org": "bdapps",
        "year": "2025"
      },
      {
        "icon": "⚙️",
        "title": "Robotics Instructor",
        "org": "ROBU · Residential Campus, BRAC University",
        "year": "2024–2025"
      },
      {
        "icon": "🏆",
        "title": "Best Campus Ambassador",
        "org": "National Innovation Competition 2024 · Technocrats V.2, IUBAT",
        "year": "2024"
      },
      {
        "icon": "💙",
        "title": "Advisor",
        "org": "Oporajita Foundation (charitable organization)",
        "year": "2024–Present"
      },
      {
        "icon": "🎖️",
        "title": "College Prefect",
        "org": "Rajuk Uttara Model College",
        "year": "2020–2022"
      },
      {
        "icon": "🏅",
        "title": "Secured 18th Position, College Category",
        "org": "Bangladesh Physics Olympiad",
        "year": "2019"
      }
    ],
    "communities": [
      {
        "name": "Robotics Club of BRAC University",
        "short": "ROBU",
        "logo": "assets/logos/robu.png",
        "roles": [
          "Director, Research and Project Management · 2025",
          "Robotics Instructor · 2024–2025"
        ],
        "description": "BRAC University's robotics community: workshops, competitions and student-built robots.",
        "facebook": "https://www.facebook.com/BRACU.Robotics.Club",
        "website": ""
      },
      {
        "name": "BRAC University Computer Club",
        "short": "BUCC",
        "logo": "assets/logos/bucc.png",
        "roles": [
          "General Secretary · 2026"
        ],
        "description": "The university's computing community: programming, tech events and learning together.",
        "facebook": "https://www.facebook.com/BRACUCC",
        "website": ""
      },
      {
        "name": "BRAC University",
        "short": "BRACU",
        "logo": "",
        "roles": [
          "B.Sc. in CSE · Currently pursuing",
          "Machine Learning Instructor · 2026"
        ],
        "description": "My university in Dhaka, where I study computer science and engineering.",
        "facebook": "https://www.facebook.com/BRACUniversity",
        "website": "https://www.bracu.ac.bd"
      }
    ]
  }
};
