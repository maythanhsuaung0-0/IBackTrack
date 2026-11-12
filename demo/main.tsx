import { createRoot } from 'react-dom/client';
import { App } from '../components/App';
import { Repository } from '../lib/storage';
import { installHighlightStyles } from '../features/highlights';
import extensionStyles from '../entrypoints/chatgpt.content/style.css?inline';
import './style.css';

if (!location.pathname.startsWith('/c/'))
  history.replaceState({}, '', '/c/demo-one');
const readUrl = () => `https://chatgpt.com${location.pathname}`;
const repository = new Repository({
  async get(key) {
    const text = localStorage.getItem(key);
    return text ? JSON.parse(text) : undefined;
  },
  async set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  async bytes() {
    return new Blob(Object.values(localStorage)).size;
  },
});
const transport: Parameters<typeof App>[0]['transport'] = (command) =>
  repository.execute(command);
const sections = [
  [
    '01',
    'Start with a question',
    'A decision tree is a sequence of questions. Each question divides your examples into smaller groups. To classify a new example, follow those questions from the root until you reach a leaf. The leaf gives you the prediction.',
  ],
  [
    '02',
    'What makes a good split?',
    'Imagine a basket containing red and green apples. You want to separate them using questions about their features. A useful question creates groups that are more consistent than the basket you started with. In machine learning, we call this a reduction in impurity.',
  ],
  [
    '03',
    'Understanding entropy',
    'Entropy measures how mixed the labels are within a group. If all examples have the same label, entropy is zero. If the labels are evenly mixed, entropy is higher. A decision tree looks for a split that reduces this uncertainty.',
  ],
  [
    '04',
    'Information gain',
    'Information gain is the decrease in entropy after a split. Subtract the weighted entropy of the child groups from the entropy of the parent group. The higher the information gain, the more useful that question is for organizing the data.',
  ],
  [
    '05',
    'A concrete example',
    'Suppose you have ten applications: six approved and four rejected. Asking whether income is above a threshold might separate the applications into two groups. Count the approved and rejected applications in each child, calculate their entropy, and compare it with the original group.',
  ],
  [
    '06',
    'Why the weights matter',
    'A child group with nine examples should contribute more to the score than a child with one example. Multiply each child’s entropy by its fraction of the parent’s examples. Then add the weighted values together before calculating information gain.',
  ],
  [
    '07',
    'Keep asking, carefully',
    'Repeat the process for each child group. You might eventually create a tree that perfectly matches your training examples. That sounds useful, but a tree that memorizes the data may perform poorly on examples it has never seen. This is overfitting.',
  ],
  [
    '08',
    'Know when to stop',
    'Limit tree depth, require a minimum number of examples in each leaf, or prune the tree. Compare different settings using validation data. Your goal is a useful model that generalizes to new examples.',
  ],
];
function Fixture() {
  return (
    <>
      <header className="fixture-header">
        <div>
          <span className="fixture-mark">↶</span>
          <strong>Backtrack</strong>
          <span className="fixture-label">INTERACTION FIXTURE</span>
        </div>
        <div>
          <button
            onClick={() => {
              history.pushState(
                {},
                '',
                location.pathname.includes('demo-one')
                  ? '/c/demo-two'
                  : '/c/demo-one',
              );
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
          >
            Switch conversation
          </button>
          <button
            onClick={() =>
              document.documentElement.classList.toggle('fixture-dark')
            }
          >
            Toggle page theme
          </button>
        </div>
      </header>
      <div className="fixture-shell">
        <nav>
          <span className="fixture-small">TRY THE WORKFLOW</span>
          <h2>
            A question can
            <br />
            take you places.
          </h2>
          <p>
            Save a spot. Explore a little.
            <br />
            Come back when you’re ready.
          </p>
          <ol>
            <li>Scroll through the example answer.</li>
            <li>
              Select a sentence or press <b>Save spot</b>.
            </li>
            <li>Append a follow-up below.</li>
            <li>
              Press <b>Return</b> in Backtrack.
            </li>
          </ol>
          <span className="fixture-privacy">
            This is a local test page.
            <br />
            No AI service is connected.
          </span>
        </nav>
        <main id="reader">
          <div className="fixture-content">
            <div className="fixture-question">
              Can you explain decision trees, entropy, and information gain in
              simple terms?
            </div>
            <article data-thread-find-target="" data-turn-id="demo-answer">
              <div className="fixture-avatar">✳</div>
              <div className="fixture-answer">
                <span className="fixture-small">AN EXAMPLE LONG ANSWER</span>
                <h1>
                  How a decision tree
                  <br />
                  learns to ask better questions.
                </h1>
                <p className="fixture-lead">
                  Let’s build the intuition one idea at a time. You can pause
                  anywhere along the way.
                </p>
                {sections.map(([n, title, text]) => (
                  <section key={n}>
                    <span className="fixture-number">{n}</span>
                    <h2>{title}</h2>
                    <p>{text}</p>
                    {n === '03' && (
                      <div className="fixture-formula">
                        <code>H(S) = −Σ pᵢ log₂(pᵢ)</code>
                        <span>Less mixing. Less uncertainty.</span>
                      </div>
                    )}
                  </section>
                ))}
                <p className="fixture-finish">
                  Now try it: save a sentence above, append a follow-up, and
                  return to where you were reading.
                </p>
              </div>
            </article>
            <div id="followups" />
            <div className="fixture-actions">
              <button
                onClick={() => {
                  const root = document.getElementById('followups')!;
                  const reply = document.createElement('article');
                  reply.dataset.threadFindTarget = '';
                  reply.dataset.turnId = `follow-up-${root.children.length}`;
                  reply.innerHTML =
                    '<div class="fixture-answer"><h2>A little detour: why use a logarithm?</h2><p>The logarithm makes the information from independent events add together. Less likely events carry more information. Entropy is an average of that information across all the possible labels.</p><p>Your original passage is saved. Press Return in Backtrack when you’re ready to continue reading.</p></div>';
                  root.append(reply);
                  reply.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Append a sample follow-up ↓
              </button>
              <p>
                The follow-up is fixture text. Use Backtrack’s Return to go
                back.
              </p>
            </div>
            <div
              className="fixture-composer"
              contentEditable
              suppressContentEditableWarning
              aria-label="Test composer"
            >
              Try typing here — Backtrack should leave this alone.
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
createRoot(document.getElementById('fixture')!).render(<Fixture />);
installHighlightStyles();
const host = document.createElement('backtrack-reader');
host.dataset.backtrack = 'ui';
document.body.append(host);
const shadow = host.attachShadow({ mode: 'open' });
const style = document.createElement('style');
style.textContent = extensionStyles;
shadow.append(style);
const app = document.createElement('div');
shadow.append(app);
createRoot(app).render(<App transport={transport} readUrl={readUrl} />);
