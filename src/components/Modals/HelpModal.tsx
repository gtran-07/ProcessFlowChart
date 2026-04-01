/**
 * components/Modals/HelpModal.tsx — AI Prompt and JSON Spec reference modal.
 *
 * Contains four tabs:
 *   1. Prompt    — a copyable AI prompt for generating FlowGraph JSON from a process description
 *   2. Example   — a small JSON example showing the expected format
 *   3. JSON Spec — field-by-field documentation of the node schema
 *   4. Workflow  — step-by-step guide for converting a flowchart to JSON using AI
 *
 * Opened by the 📋 button in the Header. Also listens for the 'flowgraph:help-state' event.
 */

import React, { useState, useEffect } from 'react';
import styles from './HelpModal.module.css';

const AI_PROMPT = `You are converting a graphical process flow (PDF/Visio/description) into a JSON file for a dependency flowchart viewer.

OUTPUT REQUIREMENT:
- Output ONLY valid JSON. No markdown. No explanation. No code fences.

JSON FORMAT:
- Output must be a JSON array of node objects: [ { ... }, { ... } ].
- Each node object MUST contain:
  - "id": string (unique)
  - "name": string (≤60 chars)
  - "owner": string (lane/group name)
  - "description": string (1–3 sentences)
  - "dependencies": array of string ids (prerequisites — nodes that must complete BEFORE this one)

DEPENDENCY DIRECTION (IMPORTANT):
- "dependencies" are PREREQUISITES.
- If step B requires step A to be done first, then B.dependencies includes "A".
- Do NOT list downstream steps as dependencies.

RULES:
1) IDs must be unique and stable. Use a consistent scheme like "REQ-01", "DES-02", "TEST-03".
2) Every dependency id must exist in the output — no dangling references.
3) If the diagram contains a loop/cycle, break it by inserting a review/approval/checkpoint node.
4) Use owner names as lane headers (or infer lanes if not explicitly labeled).
5) Keep "name" short and "description" 1–3 sentences.

FINAL VALIDATION BEFORE OUTPUT:
- Ensure no duplicate ids.
- Ensure all dependencies reference existing ids.
- Ensure dependencies represent prerequisites (not outputs).

Now output the JSON array only.`;

const EXAMPLE_JSON = `[
  {
    "id": "REQ-01",
    "name": "Gather Requirements",
    "owner": "Project",
    "description": "Collect requirements and constraints from stakeholders.",
    "dependencies": []
  },
  {
    "id": "DES-01",
    "name": "Create Functional Design",
    "owner": "Engineering",
    "description": "Draft the functional design and review with stakeholders.",
    "dependencies": ["REQ-01"]
  },
  {
    "id": "TEST-01",
    "name": "Execute Validation Test",
    "owner": "QA",
    "description": "Run validation tests and record results.",
    "dependencies": ["DES-01"]
  }
]`;

type Tab = 'prompt' | 'example' | 'spec' | 'workflow';

export function HelpModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('prompt');

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.open) setIsOpen(true);
    };
    document.addEventListener('flowgraph:help-state', handler);
    return () => document.removeEventListener('flowgraph:help-state', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  function copyText(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    });
  }

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.title}>AI Prompt → FlowGraph JSON</div>
          <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>✕</button>
        </div>
        <div className={styles.tabs}>
          {(['prompt','example','spec','workflow'] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className={styles.body}>
          {activeTab === 'prompt' && (
            <div key="prompt" className={styles.tabContent}>
              <div className={styles.row}>
                <div className={styles.hint}>Copy this prompt into any AI assistant, then describe your process flow as the input.</div>
                <button className={styles.copyBtn} onClick={() => copyText(AI_PROMPT)}>Copy Prompt</button>
              </div>
              <textarea className={styles.codeArea} readOnly value={AI_PROMPT} />
              <div className={styles.foot}>Tip: ask the AI to output <strong>JSON only</strong> (no markdown) to avoid parse errors.</div>
            </div>
          )}
          {activeTab === 'example' && (
            <div key="example" className={styles.tabContent}>
              <div className={styles.row}>
                <div className={styles.hint}>A minimal example of the JSON format accepted by FlowGraph.</div>
                <button className={styles.copyBtn} onClick={() => copyText(EXAMPLE_JSON)}>Copy Example</button>
              </div>
              <pre className={styles.codeBlock}>{EXAMPLE_JSON}</pre>
            </div>
          )}
          {activeTab === 'spec' && (
            <div key="spec" className={styles.tabContent}>
              <div className={styles.specTitle}>Required node fields</div>
              <pre className={styles.codeBlock}>{`{
  "id": "string (unique, case-sensitive)",
  "name": "string (≤60 chars, shown on node card)",
  "owner": "string (determines swim lane and color)",
  "description": "string (1–3 sentences, shown in Inspector)",
  "dependencies": ["id-of-prereq-1", "id-of-prereq-2"]
}`}</pre>
              <div className={styles.specTitle}>Rules</div>
              <ul className={styles.list}>
                <li>Output must be a <strong>JSON array</strong>: <code>[{'{'}...{'}'},{'{'}...{'}'}]</code></li>
                <li><strong>Dependencies are prerequisites</strong>: if B requires A, then B.dependencies includes "A"</li>
                <li>All dependency IDs must exist in the same file — no missing references</li>
                <li>No duplicate IDs — each node id must be unique</li>
                <li>If the process has a loop, insert a review/approval node to break the cycle</li>
              </ul>
            </div>
          )}
          {activeTab === 'workflow' && (
            <div key="workflow" className={styles.tabContent}>
              <ol className={styles.list}>
                <li>Start from your process description, PDF, or Visio diagram</li>
                <li>Copy the <strong>Prompt</strong> tab content and paste it into Copilot, Claude, or ChatGPT</li>
                <li>Follow the prompt with your process content (lanes, steps, arrows, sequence)</li>
                <li>The AI outputs a JSON array — copy it into a text file, save as <code>.json</code></li>
                <li>Load the file using <strong>Browse JSON File</strong> in FlowGraph</li>
                <li>Verify nodes and edges. Use Design Mode to add missing nodes or connections.</li>
              </ol>
              <div className={styles.foot}>Common failure: JSON loads but edges are missing → dependency IDs don't exactly match node IDs (check case sensitivity).</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
