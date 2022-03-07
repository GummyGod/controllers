import type { Patch } from 'immer';
import { nanoid } from 'nanoid';

import { BaseController } from '../BaseControllerV2';

import type { RestrictedControllerMessenger } from '../ControllerMessenger';
import type { GetSubjectMetadataState } from '../subject-metadata';

/**
 * @type NotificationState
 * @property notifications -
 */
export type NotificationState = {
  notifications: Record<string, Notification>;
};

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
};

export enum NotificationType {
  Native = 'native',
  InApp = 'in-app',
}

export interface NotificationArgs {
  /**
   * Enum type to determine notification type.
   */
  type: NotificationType;

  /**
   * A message to show on the notification.
   */
  message: string;
}

const name = 'NotificationControllerV2';

export type NotificationStateChange = {
  type: `${typeof name}:stateChange`;
  payload: [NotificationState, Patch[]];
};

export type GetNotificationState = {
  type: `${typeof name}:getState`;
  handler: () => NotificationState;
};

export type ShowNotification = {
  type: `${typeof name}:show`;
  handler: NotificationController['show'];
};

export type ControllerActions = GetNotificationState | ShowNotification;

type AllowedActions = GetSubjectMetadataState;

export type NotificationMessenger = RestrictedControllerMessenger<
  typeof name,
  ControllerActions | AllowedActions,
  NotificationStateChange,
  AllowedActions['type'],
  never
>;

const metadata = {
  notifications: { persist: true, anonymous: false },
};

const defaultState = {
  notifications: {},
};

/**
 * Controller that handles showing notifications to the user and rate limiting origins
 */
export class NotificationController extends BaseController<
  typeof name,
  NotificationState,
  NotificationMessenger
> {
  private showNativeNotification;

  /**
   * Creates a NotificationController instance.
   *
   * @param options - Constructor options.
   * @param options.messenger - A reference to the messaging system.
   * @param options.state - Initial state to set on this controller.
   * @param options.showNativeNotification - Function that shows a native notification in the consumer
   */
  constructor({
    messenger,
    state,
    showNativeNotification,
  }: {
    messenger: NotificationMessenger;
    state?: Partial<NotificationState>;
    showNativeNotification: (
      title: string,
      message: string,
      url?: string,
    ) => void;
  }) {
    super({
      name,
      metadata,
      messenger,
      state: { ...defaultState, ...state },
    });
    this.showNativeNotification = showNativeNotification;

    this.messagingSystem.registerActionHandler(
      `${name}:show` as const,
      (origin: string, args: NotificationArgs) => this.show(origin, args),
    );
  }

  /**
   * Shows a notification.
   *
   * @param origin - The origin trying to send a notification
   * @param args - Notification arguments, containing the notification message etc.
   */
  show(origin: string, args: NotificationArgs) {
    const subjectMetadataState = this.messagingSystem.call(
      'SubjectMetadataController:getState',
    );

    const originMetadata = subjectMetadataState.subjectMetadata[origin];

    switch (args.type) {
      case NotificationType.Native:
        this.showNativeNotification(
          originMetadata?.name ?? origin,
          args.message,
        );
        break;
      case NotificationType.InApp:
        this.add(originMetadata?.name ?? origin, args.message);
        break;
      default:
        throw new Error('Invalid notification type');
    }
  }

  private add(title: string, message: string) {
    const id = nanoid();
    const notification = {
      id,
      type: NotificationType.InApp,
      title,
      message,
    };
    this.update((state) => {
      state.notifications[id] = notification;
    });
  }

  /**
   * Dimisses a notification.
   *
   * @param id - The notification's ID
   */
  dismiss(id: string) {
    this.update((state) => {
      delete state.notifications[id];
    });
  }

  /**
   * Gets the current number of notifications.
   *
   * @returns The number of current notifications
   */
  getCount() {
    return Object.values(this.state.notifications).length;
  }
}