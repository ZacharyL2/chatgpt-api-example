import { useCallback, useState } from 'react';
import { Button, Input, Space, Typography } from 'antd';

import './App.css';
import ask from './ask';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/vs2015.css';

const { Text } = Typography;

const enum Role {
  Assistant = 'assistant',
  User = 'user',
}

export interface Message {
  role: Role;
  content: string;
}

interface Log extends Message {
  id: string;
  answering?: boolean;
}

export default () => {
  const [question, setQuestion] = useState('');
  const [logs, setLogs] = useState<Log[]>(() => []);

  const [answeringContent, setAnsweringContent] = useState('');

  const askQuestion = useCallback((messages: Message[]) => {
    setAnsweringContent('&ZeroWidthSpace;');

    let contents = '';
    ask((str) => {
      if (!str) return;
      if (str === '[DONE]') {
        setAnsweringContent('');
        setLogs((prev) =>
          prev.map((i) => {
            const { answering, ...rest } = i;
            if (answering) {
              return {
                ...rest,
                content: contents,
              };
            }
            return i;
          })
        );

        return;
      }

      let content = str;
      try {
        const data = JSON.parse(str);
        content = data.choices?.reduce((acc: string, cur: unknown) => {
          // @ts-expect-error
          acc += cur?.delta?.content ?? '';
          return acc;
        }, '');
      } catch {
        // Ignore
        // console.error(err);
      }

      contents += content;
      setAnsweringContent(contents);
    }, messages);
  }, []);

  const isAnswering = Boolean(answeringContent);

  const onSubmit = () => {
    if (isAnswering || !question) return;
    const messages = logs.concat({
      id: crypto.randomUUID(),
      role: Role.User,
      content: question,
    });

    askQuestion(messages.map((i) => ({ role: i.role, content: i.content })));
    setQuestion('');
    setLogs([
      ...messages,
      {
        content: '',
        answering: true,
        role: Role.Assistant,
        id: crypto.randomUUID(),
      },
    ]);
  };

  return (
    <main className='main'>
      <div className='chat'>
        <div className='logs'>
          {logs.map((l) => (
            <div key={l.id} className='log'>
              <Text strong>{l.role === Role.User ? 'User:' : 'ChatGPT:'}</Text>
              <div className={l.answering ? 'streaming' : ''}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {l.answering ? answeringContent : l.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
        <Space.Compact>
          <Input
            allowClear
            value={question}
            onPressEnter={onSubmit}
            placeholder='Enter your question'
            onChange={(e) => setQuestion(e.target.value)}
          />
          <Button type='primary' onClick={onSubmit} loading={isAnswering}>
            {isAnswering ? 'Answering' : 'Submit'}
          </Button>
        </Space.Compact>
      </div>
    </main>
  );
};
