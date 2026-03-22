---
description: How to handle Git operations across coding sessions
---
# GitHub Session Workflow

이 워크플로우 문서는 이전 세션에서 사용자가 명시적으로 지시한 Git 관리 규칙을 담고 있습니다. 코드를 수정하는 모든 작업(세션)에서 다음 규칙을 반드시 준수해야 합니다.

1. **새로운 브랜치 생성**: 매 작업(세션)을 시작할 때 코드를 수정하기 전, 목적에 맞는 새로운 feature 브랜치를 생성합니다. (예: `git checkout -b feature/update-readme`)
2. **지속적인 푸시**: 코드를 수정하고 파일이 정상적으로 작동하는 것을 확인하면, 완성된 각 단계(commit) 마다 해당 브랜치에 즉시 푸시(Push)합니다.
3. **병합 요청 (PR) 생성**: 사용자 요청에 따른 해당 세션의 작업이 모두 완료되면, 해당 브랜치를 `main` (또는 `master`)으로 병합하기 위한 머지 리퀘스트(Pull Request)를 GitHub에 생성합니다. PR의 내용은 해당 세션에서 작업한 내용을 전문적이고 상세하게 포맷해야 합니다.
4. 사용자에게 PR 링크를 제공하고 세션을 종료합니다.
