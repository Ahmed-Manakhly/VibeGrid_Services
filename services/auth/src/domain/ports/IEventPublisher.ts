export interface IEventPublisher {
  publish(eventName: string, payload: any): Promise<void>;
}
