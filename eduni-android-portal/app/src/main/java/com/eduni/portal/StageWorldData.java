package com.eduni.portal;

/** The first JNG-001 slice deliberately has one authored Camp objective. */
public final class StageWorldData {
    public final String id, birdId, birdDisplayName, birdIcon, discoveryCue, objective, landmark;
    public final String quizQuestion, quizAnswer, rewardTitle, rewardDescription, rewardBadge, collectionKey;
    public final String[] quizOptions;
    public final float birdX, birdY, landmarkX, landmarkY;

    private StageWorldData(String id, String birdId, String birdDisplayName, String birdIcon, String discoveryCue,
                           String objective, String landmark, String quizQuestion, String[] quizOptions, String quizAnswer,
                           String rewardTitle, String rewardDescription, String rewardBadge, String collectionKey,
                           float birdX, float birdY, float landmarkX, float landmarkY) {
        this.id = id; this.birdId = birdId; this.birdDisplayName = birdDisplayName; this.birdIcon = birdIcon;
        this.discoveryCue = discoveryCue; this.objective = objective; this.landmark = landmark;
        this.quizQuestion = quizQuestion; this.quizOptions = quizOptions; this.quizAnswer = quizAnswer;
        this.rewardTitle = rewardTitle; this.rewardDescription = rewardDescription; this.rewardBadge = rewardBadge; this.collectionKey = collectionKey;
        this.birdX = birdX; this.birdY = birdY; this.landmarkX = landmarkX; this.landmarkY = landmarkY;
    }

    public static StageWorldData camp() {
        return new StageWorldData(
                "camp", "camp_bluebird", "파랑새", "🐦", "등불 길에서 파랑새의 노랫소리가 들려요.",
                "등불 길을 따라 파랑새를 찾아보자", "캠프 등불", "방금 본 파랑새의 색은 무엇일까?", new String[]{"파란색", "빨간색"}, "파란색",
                "파랑새를 만났어!", "잘 관찰해서 파랑새를 도감에 담았어.", "파랑새", "collection_camp_bluebird",
                .48f, .16f, .48f, .28f);
    }
}
