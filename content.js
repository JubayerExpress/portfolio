/* Site content. Managed by admin.html (the admin panel), or edit by hand.
   Keep everything after 'window.SITE =' valid JSON. */
window.SITE = {
  "name": "Jubayer ",
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
  "heroImage": "assets/me.jpg",
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
      "title": " অহর্নিশ জাগরণ",
      "year": "2026",
      "blurb": " ",
      "tags": [
        "Literature",
        "Poetry"
      ],
      "link": "#",
      "linkText": "Read more",
      "image": "assets/uploads/1792605165367-post.jpg"
    },
    {
      "title": "Another Book or Collection",
      "year": "2026",
      "blurb": "",
      "tags": [
        "Autobiography"
      ],
      "link": "#",
      "linkText": "Read more",
      "image": "assets/uploads/1792605654830-my-journey-to-engineering.jpg"
    }
  ],
  "research": [
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
      "title": "Wormhole of ICT — HSC ICT, the fun way",
      "platform": "ictlab.bond",
      "level": "HSC (Class 11–12)",
      "description": "The full HSC ICT syllabus in Bangla & English: 6 chapters, 86 topics, 68 live labs and animations, 1200+ board-style MCQs, creative questions, model tests and a weekly live test. Earn XP, keep your streak and climb the leaderboard. Chapter 1 is free.",
      "link": "https://ictlab.bond",
      "linkText": "Start learning →",
      "image": "assets/uploads/1792606105978-wormhole-logo.jpg"
    },
    {
      "title": "CSE110 – Java & Python",
      "platform": "StudyNest",
      "level": "Beginner",
      "description": "Lessons, 300+ practice problems and all 9 lab sheets for CSE110, in Java and Python. Free to start, bilingual (English/বাংলা).",
      "link": "https://studynest.bond",
      "linkText": "\tStart learning",
      "image": "assets/uploads/1792605954982-icon-512.jpg"
    },
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
    }
  ],
  "blog": {
    "categories": [
      "Education",
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
        "n": "3×",
        "l": "Board scholarships  "
      },
      {
        "n": "18th",
        "l": "Bangladesh Physics Olympiad, college category"
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
        "icon": "🔬",
        "title": "Former Director, Research and Project Management",
        "org": "Robotics Club of BRAC University (ROBU)",
        "year": "2025"
      },
      {
        "icon": "🤖",
        "title": "Machine Learning Instructor",
        "org": "Residential Campus, BRAC University",
        "year": "2026"
      },
      {
        "icon": "⚙️",
        "title": "Robotics Instructor",
        "org": "ROBU · Residential Campus, BRAC University",
        "year": "2024–2025"
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
        "logo": "assets/uploads/1792605577171-images.jpg",
        "roles": [
          "B.Sc. in CSE · Currently pursuing"
        ],
        "description": " ",
        "facebook": "https://www.facebook.com/BRACUniversity",
        "website": "https://www.bracu.ac.bd"
      }
    ]
  }
};
