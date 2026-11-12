import { browser } from 'wxt/browser';
import { Icon } from '../../components/Icons';
import './App.css';

export default function App() {
  return (
    <main>
      <div className="brand">
        <span>
          <Icon name="back" size={24} />
        </span>
        backtrack.
      </div>
      <h1>
        Follow your curiosity.
        <br />
        Never lose your place.
      </h1>
      <p>
        In a ChatGPT conversation, save a reading spot or select text to
        highlight. Ask your follow-up, then press <strong>Return</strong>.
      </p>
      <ol>
        <li>
          <span>01</span>Save the spot where you paused.
        </li>
        <li>
          <span>02</span>Explore your question in ChatGPT.
        </li>
        <li>
          <span>03</span>Return and pick up reading.
        </li>
      </ol>
      <button
        onClick={() =>
          void browser.tabs.create({ url: 'https://chatgpt.com/' })
        }
      >
        Open ChatGPT <Icon name="arrow" size={17} />
      </button>
      <footer>
        <Icon name="lock" size={13} />
        Saved on this device. No account needed.
      </footer>
      <small>
        Use an existing conversation with a /c/ address. Refresh open ChatGPT
        tabs after installation.
      </small>
    </main>
  );
}
