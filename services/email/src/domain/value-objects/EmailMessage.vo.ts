export interface EmailMessageProps {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export class EmailMessage {
  public readonly to: string;
  public readonly subject: string;
  public readonly html: string;
  public readonly text?: string;
  public readonly from?: string;

  constructor(props: EmailMessageProps) {
    if (!props.to || !props.to.trim() || !props.to.includes('@')) {
      throw new Error('Invalid email recipient address');
    }
    if (!props.subject || !props.subject.trim()) {
      throw new Error('Email subject cannot be empty');
    }
    if (!props.html || !props.html.trim()) {
      throw new Error('Email HTML content cannot be empty');
    }

    this.to = props.to.trim().toLowerCase();
    this.subject = props.subject.trim();
    this.html = props.html;
    this.text = props.text;
    this.from = props.from;
  }
}
