import { supabaseAdmin, Battle } from './supabase-admin';

// Viral, cinematic seed prompts
export const SEED_PROMPTS = [
  'Build a terminal-based snake game in Python',
  'Create a React hook for infinite scroll',
  'Write a binary search tree in TypeScript',
  'Implement a debounce function from scratch',
  'Build a URL shortener backend in Node.js',
  'Create a CSS-only loading spinner',
  'Write a recursive Fibonacci with memoization',
  'Implement a simple pub/sub event system',
  'Build a rate limiter middleware',
  'Create a regex for email validation',
];

// Pre-generated battle results for seeding
export const SEED_BATTLES: Omit<Battle, 'id' | 'created_at'>[] = [
  {
    prompt: 'Build a terminal-based snake game in Python',
    agent_a_name: 'Nova',
    agent_b_name: 'Cipher',
    agent_a_code: `import curses\nimport random\n\ndef main(stdscr):\n    curses.curs_set(0)\n    sh, sw = stdscr.getmaxyx()\n    snake = [[sh//2, sw//4]]\n    food = [sh//2, sw//2]\n    key = curses.KEY_RIGHT\n    \n    while True:\n        next_key = stdscr.getch()\n        key = key if next_key == -1 else next_key\n        \n        head = [snake[0][0], snake[0][1]]\n        if key == curses.KEY_DOWN: head[0] += 1\n        elif key == curses.KEY_UP: head[0] -= 1\n        elif key == curses.KEY_LEFT: head[1] -= 1\n        elif key == curses.KEY_RIGHT: head[1] += 1\n        \n        snake.insert(0, head)\n        if head == food:\n            food = [random.randint(1, sh-1), random.randint(1, sw-1)]\n        else:\n            snake.pop()\n        \n        stdscr.clear()\n        for s in snake: stdscr.addch(s[0], s[1], '#')\n        stdscr.addch(food[0], food[1], '*')\n        stdscr.refresh()\n\ncurses.wrapper(main)`,
    agent_b_code: `import os, random, time, sys\nfrom collections import deque\n\nclass Snake:\n    def __init__(self, w=20, h=10):\n        self.w, self.h = w, h\n        self.snake = deque([(h//2, w//4)])\n        self.dir = (0, 1)\n        self.food = self._place_food()\n    \n    def _place_food(self):\n        while True:\n            pos = (random.randint(0, self.h-1), random.randint(0, self.w-1))\n            if pos not in self.snake: return pos\n    \n    def move(self):\n        head = self.snake[0]\n        new_head = ((head[0]+self.dir[0])%self.h, (head[1]+self.dir[1])%self.w)\n        if new_head in self.snake: return False\n        self.snake.appendleft(new_head)\n        if new_head == self.food:\n            self.food = self._place_food()\n        else:\n            self.snake.pop()\n        return True\n    \n    def render(self):\n        os.system('clear')\n        for y in range(self.h):\n            for x in range(self.w):\n                if (y,x) in self.snake: print('█', end='')\n                elif (y,x) == self.food: print('◆', end='')\n                else: print('.', end='')\n            print()`,
    agent_a_refined: `import curses\nimport random\nfrom typing import List, Tuple\n\ndef snake_game(stdscr) -> int:\n    curses.curs_set(0)\n    stdscr.nodelay(1)\n    stdscr.timeout(100)\n    \n    h, w = stdscr.getmaxyx()\n    snake: List[Tuple[int, int]] = [(h//2, w//4)]\n    food = (h//2, w//2)\n    direction = (0, 1)\n    score = 0\n    \n    DIRS = {curses.KEY_UP: (-1, 0), curses.KEY_DOWN: (1, 0),\n            curses.KEY_LEFT: (0, -1), curses.KEY_RIGHT: (0, 1)}\n    \n    while True:\n        key = stdscr.getch()\n        if key in DIRS:\n            new_dir = DIRS[key]\n            if (new_dir[0] + direction[0], new_dir[1] + direction[1]) != (0, 0):\n                direction = new_dir\n        \n        head = (snake[0][0] + direction[0], snake[0][1] + direction[1])\n        \n        if not (0 <= head[0] < h and 0 <= head[1] < w) or head in snake:\n            return score\n        \n        snake.insert(0, head)\n        if head == food:\n            score += 10\n            food = (random.randint(1, h-2), random.randint(1, w-2))\n        else:\n            snake.pop()\n        \n        stdscr.clear()\n        stdscr.addstr(0, 0, f'Score: {score}')\n        for y, x in snake:\n            stdscr.addch(y, x, '█')\n        stdscr.addch(food[0], food[1], '◆')\n        stdscr.refresh()\n\nif __name__ == '__main__':\n    print(f'Final score: {curses.wrapper(snake_game)}')`,
    agent_b_refined: `import os, random, sys, tty, termios, select\nfrom collections import deque\nfrom typing import Tuple, Deque, Set\n\nclass SnakeGame:\n    def __init__(self, width: int = 30, height: int = 15):\n        self.w, self.h = width, height\n        self.snake: Deque[Tuple[int, int]] = deque([(height//2, width//4)])\n        self.direction = (0, 1)\n        self.food = self._spawn_food()\n        self.score = 0\n        self.game_over = False\n    \n    def _spawn_food(self) -> Tuple[int, int]:\n        occupied: Set[Tuple[int, int]] = set(self.snake)\n        while True:\n            pos = (random.randint(0, self.h-1), random.randint(0, self.w-1))\n            if pos not in occupied:\n                return pos\n    \n    def update(self) -> bool:\n        head = self.snake[0]\n        new_head = (head[0] + self.direction[0], head[1] + self.direction[1])\n        \n        if not (0 <= new_head[0] < self.h and 0 <= new_head[1] < self.w):\n            return False\n        if new_head in self.snake:\n            return False\n        \n        self.snake.appendleft(new_head)\n        if new_head == self.food:\n            self.score += 10\n            self.food = self._spawn_food()\n        else:\n            self.snake.pop()\n        return True\n    \n    def render(self) -> str:\n        lines = [f'Score: {self.score}']\n        for y in range(self.h):\n            row = ''.join(\n                '█' if (y, x) in self.snake else\n                '◆' if (y, x) == self.food else '·'\n                for x in range(self.w)\n            )\n            lines.append(row)\n        return '\\n'.join(lines)`,
    critique: '{"a":{"strengths":"Clean curses implementation, proper key handling, score tracking","weaknesses":"Basic collision detection, no wrap-around option"},"b":{"strengths":"OOP design, type hints, clean separation of concerns","weaknesses":"Incomplete - missing game loop and input handling"}}',
    winner: 'A',
    score: { a: 82, b: 75, reason: 'Nova wins - complete playable game vs incomplete OOP skeleton' },
  },
  {
    prompt: 'Create a React hook for infinite scroll',
    agent_a_name: 'Apex',
    agent_b_name: 'Vortex',
    agent_a_code: `import { useState, useEffect, useRef, useCallback } from 'react';\n\nexport function useInfiniteScroll<T>(fetchFn: (page: number) => Promise<T[]>) {\n  const [items, setItems] = useState<T[]>([]);\n  const [page, setPage] = useState(1);\n  const [loading, setLoading] = useState(false);\n  const [hasMore, setHasMore] = useState(true);\n  const observer = useRef<IntersectionObserver>();\n  \n  const lastElementRef = useCallback((node: HTMLElement | null) => {\n    if (loading) return;\n    if (observer.current) observer.current.disconnect();\n    observer.current = new IntersectionObserver(entries => {\n      if (entries[0].isIntersecting && hasMore) {\n        setPage(p => p + 1);\n      }\n    });\n    if (node) observer.current.observe(node);\n  }, [loading, hasMore]);\n  \n  useEffect(() => {\n    setLoading(true);\n    fetchFn(page).then(newItems => {\n      setItems(prev => [...prev, ...newItems]);\n      setHasMore(newItems.length > 0);\n      setLoading(false);\n    });\n  }, [page, fetchFn]);\n  \n  return { items, loading, hasMore, lastElementRef };\n}`,
    agent_b_code: `import { useState, useEffect } from 'react';\n\nexport const useInfiniteScroll = (callback: () => void, threshold = 100) => {\n  const [isFetching, setIsFetching] = useState(false);\n  \n  useEffect(() => {\n    const handleScroll = () => {\n      if (window.innerHeight + document.documentElement.scrollTop >= \n          document.documentElement.offsetHeight - threshold) {\n        setIsFetching(true);\n      }\n    };\n    window.addEventListener('scroll', handleScroll);\n    return () => window.removeEventListener('scroll', handleScroll);\n  }, [threshold]);\n  \n  useEffect(() => {\n    if (!isFetching) return;\n    callback();\n  }, [isFetching, callback]);\n  \n  return [isFetching, setIsFetching] as const;\n};`,
    agent_a_refined: `import { useState, useEffect, useRef, useCallback } from 'react';\n\ninterface UseInfiniteScrollOptions {\n  threshold?: number;\n  rootMargin?: string;\n}\n\ninterface UseInfiniteScrollResult<T> {\n  items: T[];\n  loading: boolean;\n  error: Error | null;\n  hasMore: boolean;\n  lastElementRef: (node: HTMLElement | null) => void;\n  reset: () => void;\n}\n\nexport function useInfiniteScroll<T>(\n  fetchFn: (page: number) => Promise<T[]>,\n  options: UseInfiniteScrollOptions = {}\n): UseInfiniteScrollResult<T> {\n  const { threshold = 0, rootMargin = '100px' } = options;\n  \n  const [items, setItems] = useState<T[]>([]);\n  const [page, setPage] = useState(1);\n  const [loading, setLoading] = useState(false);\n  const [error, setError] = useState<Error | null>(null);\n  const [hasMore, setHasMore] = useState(true);\n  \n  const observer = useRef<IntersectionObserver | null>(null);\n  \n  const lastElementRef = useCallback((node: HTMLElement | null) => {\n    if (loading) return;\n    observer.current?.disconnect();\n    \n    observer.current = new IntersectionObserver(\n      ([entry]) => {\n        if (entry.isIntersecting && hasMore && !loading) {\n          setPage(p => p + 1);\n        }\n      },\n      { threshold, rootMargin }\n    );\n    \n    if (node) observer.current.observe(node);\n  }, [loading, hasMore, threshold, rootMargin]);\n  \n  useEffect(() => {\n    let cancelled = false;\n    setLoading(true);\n    setError(null);\n    \n    fetchFn(page)\n      .then(newItems => {\n        if (cancelled) return;\n        setItems(prev => [...prev, ...newItems]);\n        setHasMore(newItems.length > 0);\n      })\n      .catch(err => !cancelled && setError(err))\n      .finally(() => !cancelled && setLoading(false));\n    \n    return () => { cancelled = true; };\n  }, [page, fetchFn]);\n  \n  const reset = useCallback(() => {\n    setItems([]);\n    setPage(1);\n    setHasMore(true);\n    setError(null);\n  }, []);\n  \n  return { items, loading, error, hasMore, lastElementRef, reset };\n}`,
    agent_b_refined: `import { useState, useEffect, useCallback, useRef } from 'react';\n\ntype FetchStatus = 'idle' | 'loading' | 'error';\n\ninterface InfiniteScrollState {\n  status: FetchStatus;\n  setStatus: (s: FetchStatus) => void;\n}\n\nexport const useInfiniteScroll = (\n  callback: () => Promise<void>,\n  threshold = 100\n): InfiniteScrollState => {\n  const [status, setStatus] = useState<FetchStatus>('idle');\n  const callbackRef = useRef(callback);\n  callbackRef.current = callback;\n  \n  const handleScroll = useCallback(() => {\n    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;\n    const nearBottom = scrollHeight - scrollTop - clientHeight < threshold;\n    \n    if (nearBottom && status === 'idle') {\n      setStatus('loading');\n      callbackRef.current()\n        .then(() => setStatus('idle'))\n        .catch(() => setStatus('error'));\n    }\n  }, [threshold, status]);\n  \n  useEffect(() => {\n    const throttled = throttle(handleScroll, 200);\n    window.addEventListener('scroll', throttled, { passive: true });\n    return () => window.removeEventListener('scroll', throttled);\n  }, [handleScroll]);\n  \n  return { status, setStatus };\n};\n\nfunction throttle<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {\n  let lastCall = 0;\n  return ((...args) => {\n    const now = Date.now();\n    if (now - lastCall >= ms) {\n      lastCall = now;\n      fn(...args);\n    }\n  }) as T;\n}`,
    critique: '{"a":{"strengths":"Full-featured, IntersectionObserver, proper cleanup, reset function, error handling","weaknesses":"Slightly more complex API"},"b":{"strengths":"Simpler API, includes throttling, passive event listener","weaknesses":"Scroll-based less performant than IO, missing features"}}',
    winner: 'A',
    score: { a: 88, b: 72, reason: 'Apex wins - IntersectionObserver is modern best practice, full error handling' },
  },
  {
    prompt: 'Write a binary search tree in TypeScript',
    agent_a_name: 'Zenith',
    agent_b_name: 'Blaze',
    agent_a_code: `class TreeNode<T> {\n  constructor(\n    public value: T,\n    public left: TreeNode<T> | null = null,\n    public right: TreeNode<T> | null = null\n  ) {}\n}\n\nclass BST<T> {\n  root: TreeNode<T> | null = null;\n  \n  insert(value: T): void {\n    const node = new TreeNode(value);\n    if (!this.root) { this.root = node; return; }\n    \n    let current = this.root;\n    while (true) {\n      if (value < current.value) {\n        if (!current.left) { current.left = node; return; }\n        current = current.left;\n      } else {\n        if (!current.right) { current.right = node; return; }\n        current = current.right;\n      }\n    }\n  }\n  \n  search(value: T): boolean {\n    let current = this.root;\n    while (current) {\n      if (value === current.value) return true;\n      current = value < current.value ? current.left : current.right;\n    }\n    return false;\n  }\n  \n  inorder(): T[] {\n    const result: T[] = [];\n    const traverse = (node: TreeNode<T> | null) => {\n      if (!node) return;\n      traverse(node.left);\n      result.push(node.value);\n      traverse(node.right);\n    };\n    traverse(this.root);\n    return result;\n  }\n}`,
    agent_b_code: `type Node<T> = { val: T; left?: Node<T>; right?: Node<T> };\n\nconst bst = <T,>() => {\n  let root: Node<T> | undefined;\n  \n  const insert = (val: T): void => {\n    const n: Node<T> = { val };\n    if (!root) { root = n; return; }\n    const go = (node: Node<T>): void => {\n      if (val < node.val) {\n        node.left ? go(node.left) : (node.left = n);\n      } else {\n        node.right ? go(node.right) : (node.right = n);\n      }\n    };\n    go(root);\n  };\n  \n  const has = (val: T): boolean => {\n    const go = (n?: Node<T>): boolean =>\n      !n ? false : val === n.val ? true : go(val < n.val ? n.left : n.right);\n    return go(root);\n  };\n  \n  const sorted = (): T[] => {\n    const arr: T[] = [];\n    const go = (n?: Node<T>) => n && (go(n.left), arr.push(n.val), go(n.right));\n    go(root);\n    return arr;\n  };\n  \n  return { insert, has, sorted, get root() { return root; } };\n};`,
    agent_a_refined: `class TreeNode<T> {\n  constructor(\n    public value: T,\n    public left: TreeNode<T> | null = null,\n    public right: TreeNode<T> | null = null\n  ) {}\n}\n\nclass BST<T> {\n  private root: TreeNode<T> | null = null;\n  private size = 0;\n  \n  get length(): number { return this.size; }\n  get isEmpty(): boolean { return this.size === 0; }\n  \n  insert(value: T): this {\n    this.size++;\n    const node = new TreeNode(value);\n    if (!this.root) { this.root = node; return this; }\n    \n    let current = this.root;\n    while (true) {\n      if (value < current.value) {\n        if (!current.left) { current.left = node; return this; }\n        current = current.left;\n      } else {\n        if (!current.right) { current.right = node; return this; }\n        current = current.right;\n      }\n    }\n  }\n  \n  has(value: T): boolean {\n    let current = this.root;\n    while (current) {\n      if (value === current.value) return true;\n      current = value < current.value ? current.left : current.right;\n    }\n    return false;\n  }\n  \n  delete(value: T): boolean {\n    let parent: TreeNode<T> | null = null;\n    let current = this.root;\n    let isLeft = false;\n    \n    while (current && current.value !== value) {\n      parent = current;\n      isLeft = value < current.value;\n      current = isLeft ? current.left : current.right;\n    }\n    if (!current) return false;\n    \n    this.size--;\n    \n    if (!current.left && !current.right) {\n      if (!parent) this.root = null;\n      else if (isLeft) parent.left = null;\n      else parent.right = null;\n    } else if (!current.left || !current.right) {\n      const child = current.left || current.right;\n      if (!parent) this.root = child;\n      else if (isLeft) parent.left = child;\n      else parent.right = child;\n    } else {\n      let successorParent = current;\n      let successor = current.right;\n      while (successor.left) {\n        successorParent = successor;\n        successor = successor.left;\n      }\n      current.value = successor.value;\n      if (successorParent === current) successorParent.right = successor.right;\n      else successorParent.left = successor.right;\n    }\n    return true;\n  }\n  \n  *inorder(): Generator<T> {\n    function* traverse(node: TreeNode<T> | null): Generator<T> {\n      if (!node) return;\n      yield* traverse(node.left);\n      yield node.value;\n      yield* traverse(node.right);\n    }\n    yield* traverse(this.root);\n  }\n  \n  toArray(): T[] { return [...this.inorder()]; }\n}`,
    agent_b_refined: `type BSTNode<T> = { value: T; left?: BSTNode<T>; right?: BSTNode<T> };\n\ninterface BST<T> {\n  insert(value: T): BST<T>;\n  has(value: T): boolean;\n  delete(value: T): boolean;\n  min(): T | undefined;\n  max(): T | undefined;\n  toArray(): T[];\n  readonly size: number;\n}\n\nfunction createBST<T>(): BST<T> {\n  let root: BSTNode<T> | undefined;\n  let size = 0;\n  \n  const insert = (value: T): BST<T> => {\n    size++;\n    const node: BSTNode<T> = { value };\n    if (!root) { root = node; return api; }\n    \n    let current = root;\n    while (true) {\n      if (value < current.value) {\n        if (!current.left) { current.left = node; return api; }\n        current = current.left;\n      } else {\n        if (!current.right) { current.right = node; return api; }\n        current = current.right;\n      }\n    }\n  };\n  \n  const has = (value: T): boolean => {\n    let n = root;\n    while (n) {\n      if (value === n.value) return true;\n      n = value < n.value ? n.left : n.right;\n    }\n    return false;\n  };\n  \n  const findMin = (n: BSTNode<T>): BSTNode<T> => n.left ? findMin(n.left) : n;\n  \n  const deleteNode = (n: BSTNode<T> | undefined, value: T): BSTNode<T> | undefined => {\n    if (!n) return undefined;\n    if (value < n.value) n.left = deleteNode(n.left, value);\n    else if (value > n.value) n.right = deleteNode(n.right, value);\n    else {\n      size--;\n      if (!n.left) return n.right;\n      if (!n.right) return n.left;\n      const min = findMin(n.right);\n      n.value = min.value;\n      n.right = deleteNode(n.right, min.value);\n      size++; // compensate double decrement\n    }\n    return n;\n  };\n  \n  const api: BST<T> = {\n    insert,\n    has,\n    delete: (v) => { const prev = size; root = deleteNode(root, v); return size < prev; },\n    min: () => root ? findMin(root).value : undefined,\n    max: () => { let n = root; while (n?.right) n = n.right; return n?.value; },\n    toArray: () => { const r: T[] = []; const go = (n?: BSTNode<T>) => n && (go(n.left), r.push(n.value), go(n.right)); go(root); return r; },\n    get size() { return size; },\n  };\n  \n  return api;\n}`,
    critique: '{"a":{"strengths":"Complete class-based, full delete, generator pattern, fluent API","weaknesses":"More verbose than functional approach"},"b":{"strengths":"Clean functional factory, interface-driven, min/max helpers","weaknesses":"Delete logic slightly convoluted with size tracking"}}',
    winner: 'B',
    score: { a: 80, b: 84, reason: 'Blaze wins - cleaner functional design with useful min/max utilities' },
  },
];

export async function seedBattles(): Promise<{ seeded: number; skipped: boolean }> {
  // Check if battles already exist
  const { count } = await supabaseAdmin
    .from('battles')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0) {
    return { seeded: 0, skipped: true };
  }

  // Insert seed battles
  const { error } = await supabaseAdmin
    .from('battles')
    .insert(SEED_BATTLES);

  if (error) throw error;

  // Update leaderboard for each battle
  for (const battle of SEED_BATTLES) {
    if (battle.winner && battle.score) {
      await updateLeaderboard(
        battle.winner,
        battle.winner === 'A' ? battle.agent_b_name : battle.agent_a_name,
        battle.score,
        battle.agent_a_name
      );
    }
  }

  return { seeded: SEED_BATTLES.length, skipped: false };
}

async function updateLeaderboard(
  winner: string,
  loserName: string,
  scores: { a: number; b: number },
  agentAName: string
): Promise<void> {
  const winnerName = winner === 'A' ? agentAName : loserName;
  const actualLoser = winner === 'A' ? loserName : agentAName;
  const winnerScore = winner === 'A' ? scores.a : scores.b;
  const loserScore = winner === 'A' ? scores.b : scores.a;

  // Upsert winner
  const { data: winnerData } = await supabaseAdmin
    .from('leaderboard')
    .select()
    .eq('agent_name', winnerName)
    .single();

  if (winnerData) {
    const newBattles = winnerData.battles + 1;
    const newAvg = ((winnerData.avg_score * winnerData.battles) + winnerScore) / newBattles;
    await supabaseAdmin
      .from('leaderboard')
      .update({ wins: winnerData.wins + 1, battles: newBattles, avg_score: newAvg })
      .eq('agent_name', winnerName);
  } else {
    await supabaseAdmin
      .from('leaderboard')
      .insert({ agent_name: winnerName, wins: 1, battles: 1, avg_score: winnerScore });
  }

  // Upsert loser
  const { data: loserData } = await supabaseAdmin
    .from('leaderboard')
    .select()
    .eq('agent_name', actualLoser)
    .single();

  if (loserData) {
    const newBattles = loserData.battles + 1;
    const newAvg = ((loserData.avg_score * loserData.battles) + loserScore) / newBattles;
    await supabaseAdmin
      .from('leaderboard')
      .update({ battles: newBattles, avg_score: newAvg })
      .eq('agent_name', actualLoser);
  } else {
    await supabaseAdmin
      .from('leaderboard')
      .insert({ agent_name: actualLoser, wins: 0, battles: 1, avg_score: loserScore });
  }
}
