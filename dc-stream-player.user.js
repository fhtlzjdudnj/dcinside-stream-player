// ==UserScript==
// @name         디시인사이드 인방 플레이어
// @namespace    dc-stream-player
// @version      0.0.2
// @description  디시인사이드 게시글의 SOOP 및 치지직 영상 링크를 공식 임베드 플레이어로 표시합니다.
// @match        https://m.dcinside.com/*
// @match        https://gall.dcinside.com/*
// @match        https://gall.dcinside.com/board/view*
// @icon         https://gall.dcinside.com/favicon.ico
// @grant        GM_xmlhttpRequest
// @connect      api.m.sooplive.com
// @connect      api.chzzk.naver.com
// ==/UserScript==

(function () {
    'use strict';

    // =========================================================
    // 중복 방지
    // =========================================================

    const processed = new Set();
    const loading = new Set();

    // =========================================================
    // CSS
    // =========================================================

    const style = document.createElement('style');

    style.textContent = `
        .dc-stream-card {
            width: 720px;
            max-width: 100%;
            margin: 16px 0;
            border: 1px solid #e5e5e5;
            border-radius: 10px;
            overflow: hidden;
            background: #fff;
            box-sizing: border-box;
            box-shadow: 0 2px 8px rgba(0, 0, 0, .06);
        }

        /* 플레이어 */
        .dc-stream-player {
            position: relative;
            width: 100%;
            aspect-ratio: 16 / 9;
            background: #000;
        }

        .dc-stream-player iframe {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            border: 0;
            display: block;
        }

        /* 하단 정보 */
        .dc-stream-info {
            display: flex;
            align-items: center;
            gap: 10px;
            height: 64px;
            padding: 9px 12px;
            box-sizing: border-box;
        }

        /* 플랫폼 아이콘 */
        .dc-stream-icon {
            width: 42px;
            height: 42px;
            min-width: 42px;
            flex-shrink: 0;
            border-radius: 9px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            font-size: 18px;
            font-weight: 700;
            color: #fff;
        }

        .dc-stream-icon img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            border-radius: 9px;
            display: block;
        }

        /* 텍스트 */
        .dc-stream-text {
            min-width: 0;
            flex: 1;
            height: 42px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        /* 제목 */
        .dc-stream-title {
            width: 100%;
            font-size: 14px;
            font-weight: 600;
            line-height: 20px;
            color: #222;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* 주소 */
        .dc-stream-url {
            display: block;
            width: 100%;
            margin-top: 1px;
            font-size: 11px;
            line-height: 17px;
            color: #999;
            text-decoration: none;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .dc-stream-url:hover {
            text-decoration: underline;
        }

        /* VOD / CATCH / CLIP */
        .dc-stream-type {
            flex-shrink: 0;
            font-size: 10px;
            color: #777;
            background: #f3f3f3;
            padding: 4px 6px;
            border-radius: 4px;
        }

        /* 다크모드 */
        @media (prefers-color-scheme: dark) {
            .dc-stream-card {
                background: #1e1e1e;
                border-color: #333;
            }

            .dc-stream-title {
                color: #eee;
            }

            .dc-stream-url {
                color: #888;
            }

            .dc-stream-type {
                background: #333;
                color: #aaa;
            }
        }
    `;

    document.head.appendChild(style);

    // =========================================================
    // URL 분석
    // =========================================================

    function parseUrl(url) {
        // -----------------------------------------------------
        // SOOP VOD / CATCH
        // -----------------------------------------------------

        let match = url.match(
            /vod\.sooplive\.com\/player\/(\d+)(?:\/(catch))?/i
        );

        if (match) {
            return {
                platform: 'SOOP',
                type: match[2] ? 'CATCH' : 'VOD',
                id: match[1],
                original: url
            };
        }

        // -----------------------------------------------------
        // 치지직 CLIP
        // -----------------------------------------------------

        match = url.match(
            /(?:m\.)?chzzk\.naver\.com\/clips\/([^/?#]+)/i
        );

        if (match) {
            return {
                platform: 'CHZZK',
                type: 'CLIP',
                id: match[1],
                original: url
            };
        }

        // -----------------------------------------------------
        // 치지직 EMBED
        // -----------------------------------------------------

        match = url.match(
            /chzzk\.naver\.com\/embed\/clip\/([^/?#]+)/i
        );

        if (match) {
            return {
                platform: 'CHZZK',
                type: 'CLIP',
                id: match[1],
                original: url
            };
        }

        return null;
    }

    // =========================================================
    // JSON 요청
    // =========================================================

    function requestJSON(url, options = {}) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: options.method || 'GET',
                url: url,
                headers: options.headers || {},
                data: options.data || null,
                timeout: 10000,

                onload(response) {
                    try {
                        if (
                            response.status < 200 ||
                            response.status >= 300
                        ) {
                            reject(
                                new Error(
                                    'HTTP ' + response.status
                                )
                            );

                            return;
                        }

                        const json = JSON.parse(
                            response.responseText
                        );

                        resolve(json);
                    } catch (e) {
                        reject(e);
                    }
                },

                onerror() {
                    reject(
                        new Error('Network error')
                    );
                },

                ontimeout() {
                    reject(
                        new Error('Request timeout')
                    );
                }
            });
        });
    }

    // =========================================================
    // SOOP 메타데이터
    // =========================================================

    async function getSoopMetadata(info) {
        const api =
            'https://api.m.sooplive.com/station/video/a/view';

        const body = new URLSearchParams({
            nTitleNo: info.id,
            nApiLevel: '10'
        }).toString();

        try {
            const result = await requestJSON(
                api,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/x-www-form-urlencoded',

                        'Referer':
                            info.original
                    },

                    data: body
                }
            );

            const data = result?.data;

            if (!data) {
                throw new Error(
                    'SOOP data 없음'
                );
            }

            return {
                title:
                    data.title ||
                    (
                        info.type === 'CATCH'
                            ? 'SOOP CATCH'
                            : 'SOOP VOD'
                    ),

                channel:
                    data.writer_nick ||
                    data.bj_id ||
                    'SOOP'
            };
        } catch (error) {
            console.log(
                '[DC STREAM] SOOP metadata 실패:',
                error
            );

            return {
                title:
                    info.type === 'CATCH'
                        ? 'SOOP CATCH'
                        : 'SOOP VOD',

                channel: 'SOOP'
            };
        }
    }

    // =========================================================
    // 치지직 메타데이터
    // =========================================================

    async function getChzzkMetadata(info) {
        const api =
            `https://api.chzzk.naver.com/service/v1/clips/` +
            `${encodeURIComponent(info.id)}/detail`;

        try {
            const result = await requestJSON(api);

            const data = result?.content;

            if (!data) {
                throw new Error(
                    'CHZZK data 없음'
                );
            }

            const owner =
                data?.ownerChannel ||
                data?.optionalProperty?.ownerChannel ||
                {};

            return {
                title:
                    data.clipTitle ||
                    data.contentTitle ||
                    '치지직 CLIP',

                channel:
                    owner.channelName ||
                    '치지직'
            };
        } catch (error) {
            console.log(
                '[DC STREAM] CHZZK metadata 실패:',
                error
            );

            return {
                title: '치지직 CLIP',
                channel: '치지직'
            };
        }
    }

    // =========================================================
    // 메타데이터 통합
    // =========================================================

    async function getMetadata(info) {
        if (info.platform === 'SOOP') {
            return await getSoopMetadata(info);
        }

        if (info.platform === 'CHZZK') {
            return await getChzzkMetadata(info);
        }

        return {
            title: '동영상',
            channel: ''
        };
    }

    // =========================================================
    // 플랫폼 아이콘
    // =========================================================

    const SOOP_ICON_DATA_URI =
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzE3MTkxQyIgZD0iTTAgNmE2IDYgMCAwIDEgNi02aDEyYTYgNiAwIDAgMSA2IDZ2MTJhNiA2IDAgMCAxLTYgNkg2YTYgNiAwIDAgMS02LTZ6Ii8+PHBhdGggZmlsbD0idXJsKCNhKSIgZD0iTTE2LjQ1MyA2LjE4OGE1Ljg1IDUuODUgMCAwIDAtNC4zNjcgMS45NTMuMTE0LjExNCAwIDAgMS0uMTcyIDAgNS44NiA1Ljg2IDAgMSAwIDAgNy44MTIuMTE0LjExNCAwIDAgMSAuMTcyIDAgNS44NiA1Ljg2IDAgMSAwIDQuMzY4LTkuNzY1bTAgOC45MDZjLS45MzcgMC0xLjcyLS40NTItMi4yMDEtLjk2Mi0uMTUzLS4xNjMtLjM0My0uMzg2LS41NTItLjU3NnEtLjE1LS4xMzQtLjI5My0uMjQzQTIuNCAyLjQgMCAwIDAgMTIgMTIuODY3YTIuNDIgMi40MiAwIDAgMC0xLjQwNy40NDUgNCA0IDAgMCAwLS4yOTMuMjQ0Yy0uMjEuMTktLjM5OS40MTMtLjU1Mi41NzYtLjQ4LjUxLTEuMjYzLjk2Mi0yLjIwMS45NjJsLS4wNzEtLjAwMnEtLjA2LS4wMDEtLjEyMS0uMDA1LS4wNDItLjAwMi0uMDgyLS4wMDZsLS4wNDktLjAwNGEzLjA0NyAzLjA0NyAwIDAgMS0yLjcyNC0zLjAzdi4wMTMtLjAyNi4wMTNhMy4wNSAzLjA1IDAgMCAxIDIuNzI0LTMuMDNsLjA1MS0uMDA1LjA4LS4wMDYuMTIxLS4wMDQuMDctLjAwMmMuOTM4IDAgMS43MjEuNDUyIDIuMjAyLjk2Mi4xNTMuMTYzLjM0My4zODYuNTUxLjU3NXEuMTUuMTM2LjI5NC4yNDRjLjM5Mi4yOC44NzguNDQ2IDEuNDA2LjQ0NnMxLjAxNC0uMTY2IDEuNDA2LS40NDZhNSA1IDAgMCAwIC4yOTQtLjI0NGMuMjA5LS4xODkuMzk4LS40MTIuNTUxLS41NzVBMy4wNyAzLjA3IDAgMCAxIDE2LjQ1MyA5bC4wNy4wMDIuMTIyLjAwNC4wNzcuMDA2LjA1NC4wMDVhMy4wNSAzLjA1IDAgMCAxIDIuNzE4IDIuODUxbC4wMDEuMDI5LjAwMy4wODN2LjEyNHEwIC4wNDctLjAwMy4wOTR2LjAyYTMuMDUgMy4wNSAwIDAgMS0yLjcxOSAyLjg1OGwtLjA1NS4wMDRhNCA0IDAgMCAxLS4xOTkuMDFsLS4wNy4wMDN6Ii8+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJhIiB4MT0iMy43OTUiIHgyPSIyMC45MjgiIHkxPSI1LjYzIiB5Mj0iMTguOTU1IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agc3RvcC1jb2xvcj0iIzAwODJGRiIvPjxzdG9wIG9mZnNldD0iLjQyIiBzdG9wLWNvbG9yPSIjMEE5NkZGIi8+PHN0b3Agb2Zmc2V0PSIuNTYiIHN0b3AtY29sb3I9IiMwNUJDRkYiLz48c3RvcCBvZmZzZXQ9Ii43NiIgc3RvcC1jb2xvcj0iIzAwRjBGRiIvPjxzdG9wIG9mZnNldD0iLjc5IiBzdG9wLWNvbG9yPSIjMDRGMEZDIi8+PHN0b3Agb2Zmc2V0PSIuODIiIHN0b3AtY29sb3I9IiMxMEYxRjUiLz48c3RvcCBvZmZzZXQ9Ii44NSIgc3RvcC1jb2xvcj0iIzI0RjRFOCIvPjxzdG9wIG9mZnNldD0iLjg5IiBzdG9wLWNvbG9yPSIjNDBGN0Q3Ii8+PHN0b3Agb2Zmc2V0PSIuOTIiIHN0b3AtY29sb3I9IiM2NEZCQzEiLz48c3RvcCBvZmZzZXQ9Ii45NCIgc3RvcC1jb2xvcj0iIzgyRkZCMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjwvc3ZnPg==';

    const CHZZK_ICON_DATA_URI =
        'data:image/png;base64,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';

    const PLATFORM_ICON = {
        SOOP: SOOP_ICON_DATA_URI,
        CHZZK: CHZZK_ICON_DATA_URI
    };

    const PLATFORM_ALT = {
        SOOP: 'SOOP',
        CHZZK: '치지직'
    };

    function createPlatformIcon(info) {
        const icon = document.createElement('div');

        icon.className =
            'dc-stream-icon';

        const image =
            document.createElement('img');

        image.src =
            PLATFORM_ICON[info.platform] || '';

        image.alt =
            PLATFORM_ALT[info.platform] || '';

        icon.appendChild(image);

        return icon;
    }

    // =========================================================
    // Embed 주소
    // =========================================================

    function getEmbedUrl(info) {
        // -----------------------------------------------------
        // SOOP
        // -----------------------------------------------------

        if (info.platform === 'SOOP') {
            if (info.type === 'CATCH') {
                return (
                    `https://vod.sooplive.com/player/` +
                    `${info.id}/embed` +
                    `?autoPlay=false` +
                    `&mutePlay=false` +
                    `&showChat=false` +
                    `&type=catch`
                );
            }

            return (
                `https://vod.sooplive.com/player/` +
                `${info.id}/embed` +
                `?autoPlay=false` +
                `&mutePlay=false` +
                `&showChat=false`
            );
        }

        // -----------------------------------------------------
        // 치지직
        // -----------------------------------------------------

        if (info.platform === 'CHZZK') {
            return (
                `https://chzzk.naver.com/embed/clip/` +
                info.id
            );
        }

        return null;
    }

    // =========================================================
    // 카드 생성
    // =========================================================

    function createCard(link, info, metadata) {
        const uniqueId =
            `${info.platform}-${info.type}-${info.id}`;

        // -----------------------------------------------------
        // 중복 확인
        // -----------------------------------------------------

        if (
            document.querySelector(
                `[data-dc-stream-id="${CSS.escape(uniqueId)}"]`
            )
        ) {
            processed.add(uniqueId);
            return;
        }

        const embedUrl =
            getEmbedUrl(info);

        if (!embedUrl) {
            return;
        }

        processed.add(uniqueId);

        // =====================================================
        // 카드
        // =====================================================

        const card =
            document.createElement('div');

        card.className =
            'dc-stream-card';

        card.dataset.dcStreamId =
            uniqueId;

        // =====================================================
        // 플레이어
        // =====================================================

        const player =
            document.createElement('div');

        player.className =
            'dc-stream-player';

        const iframe =
            document.createElement('iframe');

        iframe.src =
            embedUrl;

        iframe.allow =
            'autoplay; fullscreen; picture-in-picture';

        iframe.allowFullscreen =
            true;

        iframe.title =
            metadata.title;

        player.appendChild(iframe);

        // =====================================================
        // 하단 정보
        // =====================================================

        const infoBox =
            document.createElement('div');

        infoBox.className =
            'dc-stream-info';

        // =====================================================
        // 플랫폼 아이콘
        // =====================================================

        const icon =
            createPlatformIcon(info);

        // =====================================================
        // 텍스트
        // =====================================================

        const text =
            document.createElement('div');

        text.className =
            'dc-stream-text';

        // 제목

        const title =
            document.createElement('div');

        title.className =
            'dc-stream-title';

        title.textContent =
            metadata.title;

        title.title =
            metadata.title;

        // 실제 주소

        const url =
            document.createElement('a');

        url.className =
            'dc-stream-url';

        url.href =
            info.original;

        url.target =
            '_blank';

        url.rel =
            'noopener noreferrer';

        url.textContent =
            info.original;

        url.title =
            info.original;

        text.appendChild(title);
        text.appendChild(url);

        // =====================================================
        // 타입
        // =====================================================

        const type =
            document.createElement('div');

        type.className =
            'dc-stream-type';

        type.textContent =
            info.type;

        // =====================================================
        // 조립
        // =====================================================

        infoBox.appendChild(icon);
        infoBox.appendChild(text);
        infoBox.appendChild(type);

        card.appendChild(player);
        card.appendChild(infoBox);

        // =====================================================
        // 디시 본문에 삽입
        // =====================================================

        link.parentNode.insertBefore(
            card,
            link.nextSibling
        );

        // 원래 링크 숨김

        link.style.display =
            'none';
    }

    // =========================================================
    // 링크 처리
    // =========================================================

    async function processLink(link) {
        if (
            link.dataset.dcStreamProcessed === '1'
        ) {
            return;
        }

        const info =
            parseUrl(link.href);

        if (!info) {
            return;
        }

        const uniqueId =
            `${info.platform}-${info.type}-${info.id}`;

        // -----------------------------------------------------
        // 중복 요청 방지
        // -----------------------------------------------------

        if (
            loading.has(uniqueId) ||
            processed.has(uniqueId)
        ) {
            return;
        }

        loading.add(uniqueId);

        link.dataset.dcStreamProcessed =
            '1';

        try {
            console.log(
                '[DC STREAM] 처리:',
                info
            );

            const metadata =
                await getMetadata(info);

            console.log(
                '[DC STREAM] metadata:',
                metadata
            );

            createCard(
                link,
                info,
                metadata
            );
        } catch (error) {
            console.error(
                '[DC STREAM] 처리 실패:',
                error
            );
        } finally {
            loading.delete(uniqueId);
        }
    }

    // =========================================================
    // 본문 검색
    // =========================================================

    function scan() {
        // PC / 모바일 후보 셀렉터
        const candidates = [
            '.write_div',
            '.thum-txt',
            '.gallview_contents',
            '#viewSubject',
            '.view_content_wrap',
            'article'
        ];

        let body = null;

        for (const selector of candidates) {
            const element =
                document.querySelector(selector);

            if (element) {
                body = element;
                break;
            }
        }

        // 못 찾으면 body 전체에서 링크 검색
        if (!body) {
            body = document.body;
        }

        if (!body) {
            return;
        }

        body
            .querySelectorAll('a[href]')
            .forEach(link => {
                processLink(link);
            });
    }

    // =========================================================
    // 최초 실행
    // =========================================================

    scan();

    // =========================================================
    // 디시 동적 로딩 대응
    // =========================================================

    let timer = null;

    const observer =
        new MutationObserver(() => {
            clearTimeout(timer);

            timer = setTimeout(
                scan,
                300
            );
        });

    observer.observe(
        document.documentElement,
        {
            childList: true,
            subtree: true
        }
    );

})();
