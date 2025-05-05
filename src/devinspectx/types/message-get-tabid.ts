
export type TabId = number;

export interface GetTabIdMessage {
    type: 'GET_TAB_ID';
}

export interface GetTabIdSuccessResponse {
    tabId: TabId;
}

export interface GetTabIdErrorResponse {
    error: string;
}

export type GetTabIdResponse = GetTabIdSuccessResponse | GetTabIdErrorResponse;

export type MessageType = GetTabIdMessage;
