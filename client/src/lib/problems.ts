export interface TestCase {
  id: number;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  passed?: boolean;
  runtimeMs?: number;
  hidden?: boolean;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  company: string;
  tags: string[];
  description: string;
  constraints: string[];
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  starterCode: {
    typescript: string;
    javascript: string;
    python: string;
  };
  functionName: string;
  testCases: TestCase[];
}

export const PROBLEMS_BANK: Problem[] = [
  {
    id: 'longest-substring',
    title: '1. Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    company: 'Cred • Google • Amazon',
    tags: ['Sliding Window', 'Hash Table', 'Strings'],
    description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.

A substring is a contiguous non-empty sequence of characters within a string.`,
    constraints: [
      '0 <= s.length <= 5 * 10^4',
      's consists of English letters, digits, symbols and spaces.',
      'Target Time Complexity: O(N)',
      'Target Space Complexity: O(min(N, M)) where M is alphabet size.'
    ],
    examples: [
      {
        input: 's = "abcabcbb"',
        output: '3',
        explanation: 'The answer is "abc", with the length of 3.'
      },
      {
        input: 's = "bbbbb"',
        output: '1',
        explanation: 'The answer is "b", with the length of 1.'
      },
      {
        input: 's = "pwwkew"',
        output: '3',
        explanation: 'The answer is "wke", with the length of 3. Notice that the answer must be a substring, "pwke" is a subsequence and not a substring.'
      }
    ],
    starterCode: {
      typescript: `function lengthOfLongestSubstring(s: string): number {
    let maxLength = 0;
    let start = 0;
    const charIndexMap = new Map<string, number>();

    for (let i = 0; i < s.length; i++) {
        const char = s[i];
        if (charIndexMap.has(char) && charIndexMap.get(char)! >= start) {
            start = charIndexMap.get(char)! + 1;
        }
        charIndexMap.set(char, i);
        maxLength = Math.max(maxLength, i - start + 1);
    }

    return maxLength;
}`,
      javascript: `function lengthOfLongestSubstring(s) {
    let maxLength = 0;
    let start = 0;
    const charIndexMap = new Map();

    for (let i = 0; i < s.length; i++) {
        const char = s[i];
        if (charIndexMap.has(char) && charIndexMap.get(char) >= start) {
            start = charIndexMap.get(char) + 1;
        }
        charIndexMap.set(char, i);
        maxLength = Math.max(maxLength, i - start + 1);
    }

    return maxLength;
}`,
      python: `def lengthOfLongestSubstring(s: str) -> int:
    char_map = {}
    max_len = 0
    start = 0
    
    for i, char in enumerate(s):
        if char in char_map and char_map[char] >= start:
            start = char_map[char] + 1
        char_map[char] = i
        max_len = max(max_len, i - start + 1)
        
    return max_len`
    },
    functionName: 'lengthOfLongestSubstring',
    testCases: [
      { id: 1, input: '"abcabcbb"', expectedOutput: '3' },
      { id: 2, input: '"bbbbb"', expectedOutput: '1' },
      { id: 3, input: '"pwwkew"', expectedOutput: '3' },
      { id: 4, input: '""', expectedOutput: '0', hidden: true },
      { id: 5, input: '"au"', expectedOutput: '2', hidden: true }
    ]
  },
  {
    id: 'two-sum',
    title: '2. Two Sum — Target Pair Discovery',
    difficulty: 'Easy',
    company: 'Uber • Microsoft • Razorpay',
    tags: ['Arrays', 'Hash Table', 'Two Pointers'],
    description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice. You can return the answer in any order.`,
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.'
    ],
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0, 1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1, 2]',
        explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].'
      },
      {
        input: 'nums = [3,3], target = 6',
        output: '[0, 1]',
        explanation: 'Because nums[0] + nums[1] == 6, we return [0, 1].'
      }
    ],
    starterCode: {
      typescript: `function twoSum(nums: number[], target: number): number[] {
    const map = new Map<number, number>();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement)!, i];
        }
        map.set(nums[i], i);
    }
    return [];
}`,
      javascript: `function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
}`,
      python: `def twoSum(nums: list[int], target: int) -> list[int]:
    prev_map = {}
    for i, n in enumerate(nums):
        diff = target - n
        if diff in prev_map:
            return [prev_map[diff], i]
        prev_map[n] = i
    return []`
    },
    functionName: 'twoSum',
    testCases: [
      { id: 1, input: '[2, 7, 11, 15], 9', expectedOutput: '[0, 1]' },
      { id: 2, input: '[3, 2, 4], 6', expectedOutput: '[1, 2]' },
      { id: 3, input: '[3, 3], 6', expectedOutput: '[0, 1]' },
      { id: 4, input: '[1, 5, 8, 3], 13', expectedOutput: '[1, 2]', hidden: true }
    ]
  },
  {
    id: 'container-with-most-water',
    title: '3. Container With Most Water',
    difficulty: 'Medium',
    company: 'Stripe • Databricks • Flipkart',
    tags: ['Two Pointers', 'Greedy', 'Arrays'],
    description: `You are given an integer array \`height\` of length \`n\`. There are \`n\` vertical lines drawn such that the two endpoints of the \`i-th\` line are \`(i, 0)\` and \`(i, height[i])\`.

Find two lines that together with the x-axis form a container, such that the container contains the **most water**.

Return the *maximum amount of water a container can store*. Notice that you may not slant the container.`,
    constraints: [
      'n == height.length',
      '2 <= n <= 10^5',
      '0 <= height[i] <= 10^4',
      'Target Time Complexity: O(N)'
    ],
    examples: [
      {
        input: 'height = [1,8,6,2,5,4,8,3,7]',
        output: '49',
        explanation: 'The vertical lines are represented by array [1,8,6,2,5,4,8,3,7]. In this case, max area of water the container can contain is 49.'
      },
      {
        input: 'height = [1,1]',
        output: '1'
      },
      {
        input: 'height = [4,3,2,1,4]',
        output: '16'
      }
    ],
    starterCode: {
      typescript: `function maxArea(height: number[]): number {
    let left = 0;
    let right = height.length - 1;
    let maxWater = 0;

    while (left < right) {
        const width = right - left;
        const currentWater = Math.min(height[left], height[right]) * width;
        maxWater = Math.max(maxWater, currentWater);

        if (height[left] < height[right]) {
            left++;
        } else {
            right--;
        }
    }

    return maxWater;
}`,
      javascript: `function maxArea(height) {
    let left = 0;
    let right = height.length - 1;
    let maxWater = 0;

    while (left < right) {
        const width = right - left;
        const currentWater = Math.min(height[left], height[right]) * width;
        maxWater = Math.max(maxWater, currentWater);

        if (height[left] < height[right]) {
            left++;
        } else {
            right--;
        }
    }

    return maxWater;
}`,
      python: `def maxArea(height: list[int]) -> int:
    left, right = 0, len(height) - 1
    max_water = 0
    
    while left < right:
        width = right - left
        current = min(height[left], height[right]) * width
        max_water = max(max_water, current)
        
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
            
    return max_water`
    },
    functionName: 'maxArea',
    testCases: [
      { id: 1, input: '[1, 8, 6, 2, 5, 4, 8, 3, 7]', expectedOutput: '49' },
      { id: 2, input: '[1, 1]', expectedOutput: '1' },
      { id: 3, input: '[4, 3, 2, 1, 4]', expectedOutput: '16' },
      { id: 4, input: '[1, 2, 1]', expectedOutput: '2', hidden: true }
    ]
  },
  {
    id: 'valid-parentheses',
    title: '4. Valid Parentheses & Bracket Validation',
    difficulty: 'Easy',
    company: 'PhonePe • Oracle • TCS Digital',
    tags: ['Stack', 'Strings'],
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only "()[]{}"'
    ],
    examples: [
      {
        input: 's = "()"',
        output: 'true'
      },
      {
        input: 's = "()[]{}"',
        output: 'true'
      },
      {
        input: 's = "(]"',
        output: 'false'
      }
    ],
    starterCode: {
      typescript: `function isValid(s: string): boolean {
    const stack: string[] = [];
    const map: Record<string, string> = {
        ')': '(',
        '}': '{',
        ']': '['
    };

    for (const char of s) {
        if (char === '(' || char === '{' || char === '[') {
            stack.push(char);
        } else if (map[char]) {
            if (stack.pop() !== map[char]) {
                return false;
            }
        }
    }

    return stack.length === 0;
}`,
      javascript: `function isValid(s) {
    const stack = [];
    const map = { ')': '(', '}': '{', ']': '[' };

    for (const char of s) {
        if (char === '(' || char === '{' || char === '[') {
            stack.push(char);
        } else if (map[char]) {
            if (stack.pop() !== map[char]) return false;
        }
    }

    return stack.length === 0;
}`,
      python: `def isValid(s: str) -> bool:
    stack = []
    close_to_open = {")": "(", "}": "{", "]": "["}
    
    for c in s:
        if c in close_to_open:
            if stack and stack[-1] == close_to_open[c]:
                stack.pop()
            else:
                return False
        else:
            stack.append(c)
            
    return True if not stack else False`
    },
    functionName: 'isValid',
    testCases: [
      { id: 1, input: '"()"', expectedOutput: 'true' },
      { id: 2, input: '"()[]{}"', expectedOutput: 'true' },
      { id: 3, input: '"(]"', expectedOutput: 'false' },
      { id: 4, input: '"([{}])"', expectedOutput: 'true', hidden: true }
    ]
  },
  {
    id: 'trapping-rain-water',
    title: '5. Trapping Rain Water',
    difficulty: 'Hard',
    company: 'Google • NVIDIA • Apple',
    tags: ['Two Pointers', 'Dynamic Programming', 'Monotonic Stack'],
    description: `Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute how much water it can trap after raining.`,
    constraints: [
      'n == height.length',
      '1 <= n <= 2 * 10^4',
      '0 <= height[i] <= 10^5'
    ],
    examples: [
      {
        input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]',
        output: '6',
        explanation: 'The above elevation map is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water are being trapped.'
      },
      {
        input: 'height = [4,2,0,3,2,5]',
        output: '9'
      }
    ],
    starterCode: {
      typescript: `function trap(height: number[]): number {
    let left = 0;
    let right = height.length - 1;
    let leftMax = 0;
    let rightMax = 0;
    let totalWater = 0;

    while (left < right) {
        if (height[left] < height[right]) {
            if (height[left] >= leftMax) {
                leftMax = height[left];
            } else {
                totalWater += leftMax - height[left];
            }
            left++;
        } else {
            if (height[right] >= rightMax) {
                rightMax = height[right];
            } else {
                totalWater += rightMax - height[right];
            }
            right--;
        }
    }

    return totalWater;
}`,
      javascript: `function trap(height) {
    let left = 0;
    let right = height.length - 1;
    let leftMax = 0;
    let rightMax = 0;
    let totalWater = 0;

    while (left < right) {
        if (height[left] < height[right]) {
            if (height[left] >= leftMax) {
                leftMax = height[left];
            } else {
                totalWater += leftMax - height[left];
            }
            left++;
        } else {
            if (height[right] >= rightMax) {
                rightMax = height[right];
            } else {
                totalWater += rightMax - height[right];
            }
            right--;
        }
    }

    return totalWater;
}`,
      python: `def trap(height: list[int]) -> int:
    if not height:
        return 0
    l, r = 0, len(height) - 1
    left_max, right_max = height[l], height[r]
    res = 0
    
    while l < r:
        if left_max < right_max:
            l += 1
            left_max = max(left_max, height[l])
            res += left_max - height[l]
        else:
            r -= 1
            right_max = max(right_max, height[r])
            res += right_max - height[r]
            
    return res`
    },
    functionName: 'trap',
    testCases: [
      { id: 1, input: '[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]', expectedOutput: '6' },
      { id: 2, input: '[4, 2, 0, 3, 2, 5]', expectedOutput: '9' },
      { id: 3, input: '[3, 0, 2, 0, 4]', expectedOutput: '7', hidden: true }
    ]
  }
];
