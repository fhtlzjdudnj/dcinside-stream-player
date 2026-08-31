# 디시인사이드 인방 플레이어

디시인사이드 갤러리 게시글에 SOOP(숲) 클립/CATCH, 치지직 클립 링크가 올라오면
클릭해서 새 창으로 이동할 필요 없이, **본문 안에서 바로 재생**되도록 자동으로 플레이어 카드를 만들어줍니다.

<table>
  <tr>
    <td align="center">
      <img width="100%" src="https://github.com/user-attachments/assets/aeda088d-39af-44c6-a242-5ee5aae3c726" />
      <br>
      <b>SOOP 예시</b>
    </td>
    <td align="center">
      <img width="100%" src="https://github.com/user-attachments/assets/8909dbe8-1f2e-4f58-8f3d-3f6a88bae472" />
      <br>
      <b>치지직 예시</b>
    </td>
  </tr>
</table>

## 주요 기능

- SOOP VOD / CATCH 링크 자동 감지 → 임베드 플레이어 삽입
- 치지직(CHZZK) 클립 링크 자동 감지 → 임베드 플레이어 삽입
- 원본 링크, 제목, 플랫폼 아이콘, VOD/CATCH/CLIP 타입 표시
- 다크모드 자동 대응

## 지원 사이트 / 링크 형식

- `gall.dcinside.com` 모든 갤러리
- `https://vod.sooplive.com/player/숫자` (VOD)
- `https://vod.sooplive.com/player/숫자/catch` (CATCH)
- `https://chzzk.naver.com/clips/...`, `https://m.chzzk.naver.com/clips/...`

## 사용법

디시인사이드 인방 플레이어의 설치 방법을 설명합니다.

아래 링크에서 유저스크립트 관리 확장기능인 **Tampermonkey**를 설치하세요.

- Chrome - [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- Firefox - [Tampermonkey](https://addons.mozilla.org/ko/firefox/addon/tampermonkey/)
- Edge - [Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

Tampermonkey 설치 후 아래 링크를 클릭하세요. 이후 뜨는 창에서 **"설치"** 버튼을 눌러 스크립트를 설치합니다.

- 설치링크 [[dc-stream-player.user.js](https://github.com/fhtlzjdudnj/dcinside-stream-player/raw/refs/heads/main/dc-stream-player.user.js)](https://github.com/fhtlzjdudnj/dcinside-stream-player/raw/refs/heads/main/dc-stream-player.user.js)

설치 후 별도 설정 없이 디시인사이드 게시글을 열면 자동으로 작동합니다.
링크 텍스트는 화면에서 숨겨지고 그 자리에 플레이어 카드가 나타납니다.

## 참고

- 문제나 개선 아이디어는 댓글로 남겨주세요.
